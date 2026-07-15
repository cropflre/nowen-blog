#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_ROOT="$(mktemp -d)"
FAKE_BIN="$TEST_ROOT/fake-bin"
CALL_LOG="$TEST_ROOT/calls.log"
HEAD_FILE="$TEST_ROOT/head"
DOCKER_CONFIG_PATH="$TEST_ROOT/docker-config"
DOCKER_PUSHED_TAGS_FILE="$TEST_ROOT/docker-pushed-tags"

cleanup() {
  rm -rf "$TEST_ROOT"
}
trap cleanup EXIT

mkdir -p "$FAKE_BIN" "$TEST_ROOT/scripts"

cat >"$FAKE_BIN/git" <<'EOF'
#!/usr/bin/env bash
printf 'git %s\n' "$*" >>"$CALL_LOG"
case "${1:-} ${2:-}" in
  "branch --show-current") echo main ;;
  "remote get-url")
    if [[ "$*" == *'--push'* ]]; then
      echo "${FAKE_PUSH_URL:-https://github.com/cropflre/nowen-blog.git}"
    else
      echo 'https://github.com/cropflre/nowen-blog.git'
    fi
    ;;
  "status --porcelain") ;;
  "tag -l") ;;
  "ls-remote "*)
    if [[ "$*" == *"refs/tags/v1.0.5"* ]] && [ -n "${FAKE_REMOTE_TAG_TARGET:-}" ]; then
      printf '%s\trefs/tags/v1.0.5\n' "$FAKE_REMOTE_TAG_TARGET"
      exit 0
    fi
    exit 2
    ;;
  "merge-base --is-ancestor") [ "${FAKE_REMOTE_COMMIT:-0}" = "1" ] ;;
  "rev-parse HEAD") cat "$HEAD_FILE" ;;
  "rev-parse HEAD^") echo original-head ;;
  "rev-parse "*) exit 1 ;;
  "log -1") [ "${FAKE_RELEASE_COMMIT_VALID:-0}" = "1" ] && echo 'chore(release): v1.0.5' ;;
  "diff-tree --no-commit-id") [ "${FAKE_RELEASE_COMMIT_VALID:-0}" = "1" ] && echo package.json ;;
  "show release-head^:package.json")
    [ "${FAKE_RELEASE_COMMIT_VALID:-0}" = "1" ] || exit 1
    node -e "const p=require('$TEST_ROOT/package.json');p.version='1.0.4';process.stdout.write(JSON.stringify(p))"
    ;;
  "show release-head:package.json")
    [ "${FAKE_RELEASE_COMMIT_VALID:-0}" = "1" ] || exit 1
    cat "$TEST_ROOT/package.json"
    ;;
  "diff --cached") exit 1 ;;
  "pull --ff-only")
    [ "${FAKE_PULL_CHANGES:-0}" != "1" ] || echo synced-head >"$HEAD_FILE"
    ;;
  "push --dry-run") [ "${FAKE_GIT_PUSH_DRY_RUN_FAIL:-0}" != "1" ] ;;
  "commit -m")
    [ "${FAKE_GIT_COMMIT_FAIL:-0}" != "1" ] || exit 22
    echo release-head >"$HEAD_FILE"
    ;;
  "reset --mixed")
    [ "${FAKE_GIT_RESET_FAIL:-0}" != "1" ] || exit 23
    echo "$3" >"$HEAD_FILE"
    ;;
  *) exit 0 ;;
esac
EOF

cat >"$FAKE_BIN/docker" <<'EOF'
#!/usr/bin/env bash
printf 'docker %s\n' "$*" >>"$CALL_LOG"
if [ "${1:-} ${2:-} ${3:-}" = "buildx imagetools inspect" ]; then
  if [[ "$*" == *'--raw'* ]]; then
    printf '{"schemaVersion":2}'
  elif [[ "$*" == *'--format'* ]]; then
    revision="${FAKE_DOCKER_V_REVISION:-release-head}"
    [[ "$*" == *':latest'* ]] && revision="${FAKE_DOCKER_LATEST_REVISION:-release-head}"
    if [ -f "$DOCKER_PUSHED_TAGS_FILE" ]; then
      if [[ "$*" == *':latest'* ]] && grep -Fq ':latest' "$DOCKER_PUSHED_TAGS_FILE"; then
        revision="release-head"
      elif [[ "$*" == *':v1.0.5'* ]] && grep -Fq ':v1.0.5' "$DOCKER_PUSHED_TAGS_FILE"; then
        revision="release-head"
      fi
    fi
    printf '{"org.opencontainers.image.revision":"%s"}' "$revision"
  fi
  exit 0
fi
if [ "${1:-} ${2:-}" = "buildx bake" ]; then
  if [[ "$*" == *"--push"* ]] && [ "${FAKE_DOCKER_FAIL:-}" = "push" ]; then
    exit 17
  fi
  if [[ "$*" != *"--push"* ]] && [ "${FAKE_DOCKER_FAIL:-}" = "build" ]; then
    exit 16
  fi
  [[ "$*" != *"--push"* ]] || printf '%s' "${IMAGE_TAGS:-}" >"$DOCKER_PUSHED_TAGS_FILE"
  if [[ "$*" == *"--push"* ]] && [ "${FAKE_HEAD_CHANGE_ON_DOCKER_PUSH:-0}" = "1" ]; then
    echo external-head >"$HEAD_FILE"
  fi
fi
exit 0
EOF

cat >"$FAKE_BIN/gh" <<'EOF'
#!/usr/bin/env bash
printf 'gh %s\n' "$*" >>"$CALL_LOG"
if [ "${1:-} ${2:-}" = "auth status" ] && [ "${FAKE_GH_AUTH_FAIL:-0}" = "1" ]; then
  exit 19
fi
if [ "${1:-} ${2:-}" = "release view" ]; then
  if [ "${FAKE_GH_RELEASE_EXISTS:-0}" = "1" ]; then
    exit 0
  fi
  exit 1
fi
exit 0
EOF

cat >"$FAKE_BIN/curl" <<'EOF'
#!/usr/bin/env bash
case "$*" in
  *'tags?page_size='*) printf '{"results":[]}' ;;
  *)
    if [ -n "${FAKE_DOCKER_HTTP_CODE:-}" ]; then
      printf '%s' "$FAKE_DOCKER_HTTP_CODE"
    elif [[ "$*" == *'/tags/latest'* ]] && [ -n "${FAKE_DOCKER_LATEST_EXISTS:-}" ]; then
      [ "$FAKE_DOCKER_LATEST_EXISTS" = "1" ] && printf '200' || printf '404'
    elif [ "${FAKE_DOCKER_TAG_EXISTS:-0}" = "1" ]; then
      printf '200'
    else
      printf '404'
    fi
    ;;
esac
EOF

cat >"$FAKE_BIN/pnpm" <<'EOF'
#!/usr/bin/env bash
printf 'pnpm %s\n' "$*" >>"$CALL_LOG"
exit 0
EOF

chmod +x "$FAKE_BIN/git" "$FAKE_BIN/docker" "$FAKE_BIN/gh" "$FAKE_BIN/curl" "$FAKE_BIN/pnpm"

prepare_case() {
  unset FAKE_DOCKER_FAIL FAKE_DOCKER_TAG_EXISTS FAKE_DOCKER_LATEST_EXISTS FAKE_DOCKER_HTTP_CODE
  unset FAKE_DOCKER_V_REVISION FAKE_DOCKER_LATEST_REVISION
  unset FAKE_HEAD_CHANGE_ON_DOCKER_PUSH FAKE_PUSH_URL
  unset FAKE_REMOTE_COMMIT FAKE_REMOTE_TAG_TARGET FAKE_GH_RELEASE_EXISTS FAKE_GH_AUTH_FAIL
  unset FAKE_GIT_COMMIT_FAIL FAKE_GIT_RESET_FAIL FAKE_GIT_PUSH_DRY_RUN_FAIL FAKE_PULL_CHANGES FAKE_RELEASE_COMMIT_VALID
  rm -f "$DOCKER_PUSHED_TAGS_FILE"
  rm -rf "$TEST_ROOT/.tmp"
  rm -rf "$DOCKER_CONFIG_PATH"
  mkdir -p "$DOCKER_CONFIG_PATH"
  printf '{"auths":{"https://index.docker.io/v1/":{"auth":"dGVzdC11c2VyOnRlc3QtdG9rZW4="}}}\n' >"$DOCKER_CONFIG_PATH/config.json"
  : >"$CALL_LOG"
  printf 'original-head' >"$HEAD_FILE"
  cp "$ROOT_DIR/package.json" "$TEST_ROOT/package.json"
  cp "$ROOT_DIR/docker-bake.hcl" "$TEST_ROOT/docker-bake.hcl"
  cp "$ROOT_DIR/docker-compose.yml" "$TEST_ROOT/docker-compose.yml"
  cp "$ROOT_DIR/docker-compose.release.yml" "$TEST_ROOT/docker-compose.release.yml"
  cp "$ROOT_DIR/scripts/release-docker.sh" "$TEST_ROOT/scripts/release-docker.sh"
}

run_quick_release() {
  cd "$TEST_ROOT"
  export PATH="$FAKE_BIN:$PATH" CALL_LOG HEAD_FILE DOCKER_PUSHED_TAGS_FILE TEST_ROOT
  export FAKE_GH_AUTH_FAIL FAKE_GIT_COMMIT_FAIL FAKE_GIT_RESET_FAIL FAKE_GIT_PUSH_DRY_RUN_FAIL FAKE_PULL_CHANGES
  export FAKE_HEAD_CHANGE_ON_DOCKER_PUSH FAKE_PUSH_URL
  export FAKE_RELEASE_COMMIT_VALID
  export FAKE_DOCKER_HTTP_CODE
  export DOCKER_CONFIG="$DOCKER_CONFIG_PATH"
  printf '\n' | bash scripts/release-docker.sh 2>&1
}

run_resume_release() {
  cd "$TEST_ROOT"
  export PATH="$FAKE_BIN:$PATH" CALL_LOG HEAD_FILE DOCKER_PUSHED_TAGS_FILE TEST_ROOT
  export FAKE_GH_AUTH_FAIL FAKE_RELEASE_COMMIT_VALID
  export DOCKER_CONFIG="$DOCKER_CONFIG_PATH"
  export FAKE_DOCKER_TAG_EXISTS FAKE_DOCKER_LATEST_EXISTS FAKE_DOCKER_V_REVISION FAKE_DOCKER_LATEST_REVISION
  export FAKE_REMOTE_COMMIT FAKE_GH_RELEASE_EXISTS FAKE_REMOTE_TAG_TARGET
  bash scripts/release-docker.sh --resume --version 1.0.5 --yes 2>&1
}

prepare_case
output="$(run_quick_release)"

printf '%s' "$output" | grep -Fq 'NOWEN Blog 快速发布向导'
printf '%s' "$output" | grep -Fq '架构:          multi (linux/amd64,linux/arm64)'
printf '%s' "$output" | grep -Fq 'GitHub Release: on'

docker_push_line="$(grep -n 'docker buildx bake .*--push' "$CALL_LOG" | head -n 1 | cut -d: -f1)"
git_push_line="$(grep -n 'git push origin release-head:main' "$CALL_LOG" | head -n 1 | cut -d: -f1)"
[ "$docker_push_line" -lt "$git_push_line" ]

prepare_case
set +e
head_changed_output="$(FAKE_HEAD_CHANGE_ON_DOCKER_PUSH=1 run_quick_release)"
head_changed_status=$?
set -e
[ "$head_changed_status" -ne 0 ]
printf '%s' "$head_changed_output" | grep -Fq '当前 HEAD'
if grep -Fq 'git push origin release-head:main' "$CALL_LOG" || grep -Fq 'git tag -a v1.0.5' "$CALL_LOG"; then
  echo 'Docker 推送后 HEAD 改变时不得继续推送 Git 或创建 Tag。' >&2
  exit 1
fi

prepare_case
set +e
push_url_output="$(FAKE_PUSH_URL=https://github.com/example/fork.git run_quick_release)"
push_url_status=$?
set -e
[ "$push_url_status" -ne 0 ]
printf '%s' "$push_url_output" | grep -Fq 'push URL'
if grep -Fq 'git pull --ff-only' "$CALL_LOG" || grep -Fq 'docker buildx bake' "$CALL_LOG"; then
  echo 'origin push URL 不匹配时必须在本地写操作前终止。' >&2
  exit 1
fi

prepare_case
set +e
build_failure_output="$(FAKE_DOCKER_FAIL=build run_quick_release)"
build_failure_status=$?
set -e
[ "$build_failure_status" -ne 0 ]
grep -Fq 'git reset --mixed original-head' "$CALL_LOG"
printf '%s' "$build_failure_output" | grep -Fq '发布失败，本地版本和 release commit 已恢复'
[ ! -f "$TEST_ROOT/.tmp/release-docker-state.json" ]

prepare_case
set +e
commit_failure_output="$(FAKE_GIT_COMMIT_FAIL=1 run_quick_release)"
commit_failure_status=$?
set -e
[ "$commit_failure_status" -ne 0 ]
grep -Fq 'git reset -- package.json' "$CALL_LOG"
printf '%s' "$commit_failure_output" | grep -Fq '发布失败，本地版本和 release commit 已恢复'

prepare_case
set +e
reset_failure_output="$(FAKE_DOCKER_FAIL=build FAKE_GIT_RESET_FAIL=1 run_quick_release)"
reset_failure_status=$?
set -e
[ "$reset_failure_status" -ne 0 ]
[ -f "$TEST_ROOT/.tmp/release-docker-state.json" ]
printf '%s' "$reset_failure_output" | grep -Fq '自动恢复失败'
printf '%s' "$reset_failure_output" | grep -Fq 'git reset --mixed original-head'

prepare_case
set +e
push_failure_output="$(FAKE_DOCKER_FAIL=push run_quick_release)"
push_failure_status=$?
set -e
[ "$push_failure_status" -ne 0 ]
if grep -Fq 'git reset --mixed' "$CALL_LOG"; then
  echo '远端发布开始后不应自动重置本地 release commit。' >&2
  exit 1
fi
[ -f "$TEST_ROOT/.tmp/release-docker-state.json" ]
printf '%s' "$push_failure_output" | grep -Fq 'pnpm release:docker -- --resume -v 1.0.5'

prepare_case
printf 'release-head' >"$HEAD_FILE"
mkdir -p "$TEST_ROOT/.tmp"
cat >"$TEST_ROOT/.tmp/release-docker-state.json" <<'EOF'
{
  "schemaVersion": 1,
  "version": "1.0.5",
  "image": "cropflre/nowen-blog",
  "arch": "multi",
  "latest": true,
  "releaseSha": "release-head",
  "originalHead": "original-head",
  "completed": {
    "docker": true,
    "gitCommit": true,
    "gitTag": false,
    "githubRelease": false
  }
}
EOF
resume_output="$(
  FAKE_DOCKER_TAG_EXISTS=1 \
  FAKE_REMOTE_COMMIT=1 \
  FAKE_GH_RELEASE_EXISTS=0 \
    run_resume_release
)"
if grep -Fq 'docker buildx bake' "$CALL_LOG"; then
  echo '续传不应重新推送已存在的 Docker 镜像。' >&2
  exit 1
fi
if grep -Fq 'git push origin HEAD:main' "$CALL_LOG"; then
  echo '续传不应重新推送已存在的 release commit。' >&2
  exit 1
fi
grep -Fq 'git push origin v1.0.5' "$CALL_LOG"
grep -Fq 'git tag -a v1.0.5 release-head -m Release v1.0.5' "$CALL_LOG"
grep -Fq 'gh release create v1.0.5' "$CALL_LOG"
printf '%s' "$resume_output" | grep -Fq '续传完成'

prepare_case
printf 'release-head' >"$HEAD_FILE"
mkdir -p "$TEST_ROOT/.tmp"
cat >"$TEST_ROOT/.tmp/release-docker-state.json" <<'EOF'
{
  "schemaVersion": 1,
  "version": "1.0.5",
  "image": "cropflre/nowen-blog",
  "arch": "multi",
  "latest": true,
  "releaseSha": "release-head",
  "originalHead": "original-head",
  "enabled": {
    "gitPush": true,
    "gitTag": true,
    "githubRelease": true
  },
  "completed": {
    "docker": true,
    "gitCommit": true,
    "gitTag": true,
    "githubRelease": true
  }
}
EOF
latest_resume_output="$(FAKE_DOCKER_TAG_EXISTS=1 \
FAKE_DOCKER_LATEST_EXISTS=0 \
FAKE_REMOTE_COMMIT=1 \
FAKE_GH_RELEASE_EXISTS=1 \
FAKE_REMOTE_TAG_TARGET=release-head \
  run_resume_release)"
grep -Fq 'docker buildx bake ' "$CALL_LOG"
grep -Fq -- '--push' "$CALL_LOG"
printf '%s' "$latest_resume_output" | grep -Fq 'IMAGE_TAGS=cropflre/nowen-blog:latest'
if printf '%s' "$latest_resume_output" | grep -Fq 'IMAGE_TAGS=cropflre/nowen-blog:v1.0.5,'; then
  echo '仅补推 latest 时不得覆盖已存在的版本 Tag。' >&2
  exit 1
fi

prepare_case
printf 'release-head' >"$HEAD_FILE"
mkdir -p "$TEST_ROOT/.tmp"
cat >"$TEST_ROOT/.tmp/release-docker-state.json" <<'EOF'
{
  "schemaVersion": 1,
  "version": "1.0.5",
  "image": "cropflre/nowen-blog",
  "arch": "multi",
  "latest": true,
  "releaseSha": "release-head",
  "originalHead": "original-head",
  "enabled": { "gitPush": true, "gitTag": true, "githubRelease": true },
  "completed": { "docker": true, "gitCommit": true, "gitTag": true, "githubRelease": true }
}
EOF
stale_latest_output="$(FAKE_DOCKER_TAG_EXISTS=1 \
FAKE_DOCKER_LATEST_EXISTS=1 \
FAKE_DOCKER_LATEST_REVISION=previous-release \
FAKE_REMOTE_COMMIT=1 \
FAKE_GH_RELEASE_EXISTS=1 \
FAKE_REMOTE_TAG_TARGET=release-head \
  run_resume_release)"
printf '%s' "$stale_latest_output" | grep -Fq 'IMAGE_TAGS=cropflre/nowen-blog:latest'

prepare_case
printf 'release-head' >"$HEAD_FILE"
mkdir -p "$TEST_ROOT/.tmp"
cat >"$TEST_ROOT/.tmp/release-docker-state.json" <<'EOF'
{
  "schemaVersion": 1,
  "version": "1.0.5",
  "image": "cropflre/nowen-blog",
  "arch": "multi",
  "latest": true,
  "releaseSha": "release-head",
  "originalHead": "original-head",
  "enabled": { "gitPush": true, "gitTag": true, "githubRelease": true },
  "completed": { "docker": true, "gitCommit": true, "gitTag": true, "githubRelease": true }
}
EOF
set +e
docker_revision_conflict_output="$(FAKE_DOCKER_TAG_EXISTS=1 \
FAKE_DOCKER_LATEST_EXISTS=1 \
FAKE_DOCKER_V_REVISION=other-release \
FAKE_REMOTE_COMMIT=1 \
FAKE_GH_RELEASE_EXISTS=1 \
FAKE_REMOTE_TAG_TARGET=release-head \
  run_resume_release)"
docker_revision_conflict_status=$?
set -e
[ "$docker_revision_conflict_status" -ne 0 ]
printf '%s' "$docker_revision_conflict_output" | grep -Fq '镜像 revision 冲突'
if grep -Fq 'docker buildx bake' "$CALL_LOG"; then
  echo '版本镜像 revision 冲突时不得覆盖远端 Tag。' >&2
  exit 1
fi

prepare_case
set +e
unsafe_inference_output="$(
  FAKE_DOCKER_TAG_EXISTS=0 \
  FAKE_REMOTE_COMMIT=0 \
  FAKE_GH_RELEASE_EXISTS=0 \
    run_resume_release
)"
unsafe_inference_status=$?
set -e
[ "$unsafe_inference_status" -ne 0 ]
printf '%s' "$unsafe_inference_output" | grep -Fq '无法安全推断'
if grep -Fq 'docker buildx bake' "$CALL_LOG" || grep -Fq 'git push origin' "$CALL_LOG"; then
  echo '无状态续传无法证明 release commit 时不得产生远端写操作。' >&2
  exit 1
fi

prepare_case
printf 'release-head' >"$HEAD_FILE"
PACKAGE_FILE="$TEST_ROOT/package.json" node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(process.env.PACKAGE_FILE, 'utf8'));
pkg.version = '1.0.5';
writeFileSync(process.env.PACKAGE_FILE, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
NODE
inferred_resume_output="$(FAKE_RELEASE_COMMIT_VALID=1 \
FAKE_DOCKER_TAG_EXISTS=1 \
FAKE_DOCKER_LATEST_EXISTS=1 \
FAKE_REMOTE_COMMIT=1 \
FAKE_REMOTE_TAG_TARGET=release-head \
FAKE_GH_RELEASE_EXISTS=1 \
  run_resume_release)"
printf '%s' "$inferred_resume_output" | grep -Fq '续传完成'
if grep -Fq 'docker buildx bake' "$CALL_LOG" || grep -Fq 'git push origin' "$CALL_LOG"; then
  echo '无状态续传推断成功且远端完整时不应重复发布。' >&2
  exit 1
fi

prepare_case
mkdir -p "$TEST_ROOT/.tmp"
printf '{"schemaVersion":99}\n' >"$TEST_ROOT/.tmp/release-docker-state.json"
set +e
invalid_state_output="$(run_resume_release)"
invalid_state_status=$?
set -e
[ "$invalid_state_status" -ne 0 ]
printf '%s' "$invalid_state_output" | grep -Fq '状态文件格式版本不受支持'
if grep -Fq 'docker buildx bake' "$CALL_LOG" || grep -Fq 'git push origin' "$CALL_LOG"; then
  echo '状态文件无效时不得产生远端写操作。' >&2
  exit 1
fi

prepare_case
printf 'newer-local-head' >"$HEAD_FILE"
mkdir -p "$TEST_ROOT/.tmp"
cat >"$TEST_ROOT/.tmp/release-docker-state.json" <<'EOF'
{
  "schemaVersion": 1,
  "version": "1.0.5",
  "image": "cropflre/nowen-blog",
  "arch": "multi",
  "latest": true,
  "releaseSha": "release-head",
  "originalHead": "original-head",
  "completed": {
    "docker": true,
    "gitCommit": false,
    "gitTag": false,
    "githubRelease": false
  }
}
EOF
set +e
head_mismatch_output="$(
  FAKE_DOCKER_TAG_EXISTS=0 \
  FAKE_REMOTE_COMMIT=0 \
  FAKE_GH_RELEASE_EXISTS=0 \
    run_resume_release
)"
head_mismatch_status=$?
set -e
[ "$head_mismatch_status" -ne 0 ]
printf '%s' "$head_mismatch_output" | grep -Fq '当前 HEAD'
if grep -Fq 'git push origin' "$CALL_LOG"; then
  echo '当前 HEAD 与 release commit 不一致时不得推送 Git。' >&2
  exit 1
fi
if grep -Fq 'docker buildx bake' "$CALL_LOG"; then
  echo '当前 HEAD 与 release commit 不一致时不得构建或推送 Docker 镜像。' >&2
  exit 1
fi

prepare_case
printf 'release-head' >"$HEAD_FILE"
mkdir -p "$TEST_ROOT/.tmp"
cat >"$TEST_ROOT/.tmp/release-docker-state.json" <<'EOF'
{
  "schemaVersion": 1,
  "version": "1.0.5",
  "image": "cropflre/nowen-blog",
  "arch": "multi",
  "latest": true,
  "releaseSha": "release-head",
  "originalHead": "original-head",
  "enabled": {
    "gitPush": true,
    "gitTag": true,
    "githubRelease": true
  },
  "completed": {
    "docker": false,
    "gitCommit": false,
    "gitTag": false,
    "githubRelease": false
  }
}
EOF
set +e
resume_auth_output="$(
  FAKE_GH_AUTH_FAIL=1 \
  FAKE_DOCKER_TAG_EXISTS=0 \
  FAKE_REMOTE_COMMIT=0 \
  FAKE_GH_RELEASE_EXISTS=0 \
    run_resume_release
)"
resume_auth_status=$?
set -e
[ "$resume_auth_status" -ne 0 ]
printf '%s' "$resume_auth_output" | grep -Fq 'gh auth login'
if grep -Fq 'docker buildx bake' "$CALL_LOG"; then
  echo '续传所需的 GitHub 认证失败时不得开始 Docker 推送。' >&2
  exit 1
fi

prepare_case
printf 'release-head' >"$HEAD_FILE"
mkdir -p "$TEST_ROOT/.tmp"
cat >"$TEST_ROOT/.tmp/release-docker-state.json" <<'EOF'
{
  "schemaVersion": 1,
  "version": "1.0.5",
  "image": "cropflre/nowen-blog",
  "arch": "multi",
  "latest": true,
  "releaseSha": "release-head",
  "originalHead": "original-head",
  "completed": {
    "docker": true,
    "gitCommit": true,
    "gitTag": false,
    "githubRelease": false
  }
}
EOF
set +e
conflict_output="$(
  FAKE_DOCKER_TAG_EXISTS=1 \
  FAKE_REMOTE_COMMIT=1 \
  FAKE_GH_RELEASE_EXISTS=0 \
  FAKE_REMOTE_TAG_TARGET=other-release-head \
    run_resume_release
)"
conflict_status=$?
set -e
[ "$conflict_status" -ne 0 ]
printf '%s' "$conflict_output" | grep -Fq '冲突'
if grep -Fq 'gh release create' "$CALL_LOG"; then
  echo 'Tag 冲突时不得创建 GitHub Release。' >&2
  exit 1
fi

prepare_case
set +e
gh_failure_output="$(FAKE_GH_AUTH_FAIL=1 run_quick_release)"
gh_failure_status=$?
set -e
[ "$gh_failure_status" -ne 0 ]
printf '%s' "$gh_failure_output" | grep -Fq 'gh auth login'
if grep -Fq 'git commit' "$CALL_LOG" || grep -Fq 'docker buildx bake' "$CALL_LOG"; then
  echo 'GitHub 认证失败必须在修改版本和构建之前终止。' >&2
  exit 1
fi

prepare_case
rm -f "$DOCKER_CONFIG_PATH/config.json"
set +e
docker_login_output="$(run_quick_release)"
docker_login_status=$?
set -e
[ "$docker_login_status" -ne 0 ]
printf '%s' "$docker_login_output" | grep -Fq 'docker login'
if grep -Fq 'git commit' "$CALL_LOG" || grep -Fq 'docker buildx bake' "$CALL_LOG"; then
  echo 'Docker Hub 未登录必须在修改版本和构建之前终止。' >&2
  exit 1
fi

prepare_case
printf '{"auths":{"https://index.docker.io/v1/":{"auth":"broken"}}}\n' >"$DOCKER_CONFIG_PATH/config.json"
set +e
invalid_docker_login_output="$(run_quick_release)"
invalid_docker_login_status=$?
set -e
[ "$invalid_docker_login_status" -ne 0 ]
printf '%s' "$invalid_docker_login_output" | grep -Fq 'docker login'
if grep -Fq 'git commit' "$CALL_LOG" || grep -Fq 'docker buildx bake' "$CALL_LOG"; then
  echo 'Docker Hub 凭据格式无效时必须在修改版本前终止。' >&2
  exit 1
fi

prepare_case
set +e
git_preflight_output="$(FAKE_PULL_CHANGES=1 FAKE_GIT_PUSH_DRY_RUN_FAIL=1 run_quick_release)"
git_preflight_status=$?
set -e
[ "$git_preflight_status" -ne 0 ]
printf '%s' "$git_preflight_output" | grep -Fq '无法推送到 GitHub'
[ "$(cat "$HEAD_FILE")" = "original-head" ]
if grep -Fq 'git pull --ff-only' "$CALL_LOG"; then
  echo '只读预检完成前不得执行 git pull 修改本地 HEAD。' >&2
  exit 1
fi

prepare_case
set +e
docker_probe_output="$(FAKE_DOCKER_HTTP_CODE=429 run_quick_release)"
docker_probe_status=$?
set -e
[ "$docker_probe_status" -ne 0 ]
printf '%s' "$docker_probe_output" | grep -Fq '无法确认 Docker Hub Tag'
if grep -Fq 'git commit' "$CALL_LOG" || grep -Fq 'docker buildx bake' "$CALL_LOG"; then
  echo 'Docker Hub 探测异常时不得修改版本或开始构建。' >&2
  exit 1
fi

echo 'Docker release quick wizard passed.'
