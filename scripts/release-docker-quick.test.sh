#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_ROOT="$(mktemp -d)"
FAKE_BIN="$TEST_ROOT/fake-bin"
CALL_LOG="$TEST_ROOT/calls.log"
HEAD_FILE="$TEST_ROOT/head"
DOCKER_CONFIG_PATH="$TEST_ROOT/docker-config"

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
  "rev-parse "*) exit 1 ;;
  "diff --cached") exit 1 ;;
  "commit -m") echo release-head >"$HEAD_FILE" ;;
  "reset --mixed") echo "$3" >"$HEAD_FILE" ;;
  *) exit 0 ;;
esac
EOF

cat >"$FAKE_BIN/docker" <<'EOF'
#!/usr/bin/env bash
printf 'docker %s\n' "$*" >>"$CALL_LOG"
if [ "${1:-} ${2:-}" = "buildx bake" ]; then
  if [[ "$*" == *"--push"* ]] && [ "${FAKE_DOCKER_FAIL:-}" = "push" ]; then
    exit 17
  fi
  if [[ "$*" != *"--push"* ]] && [ "${FAKE_DOCKER_FAIL:-}" = "build" ]; then
    exit 16
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
    if [ "${FAKE_DOCKER_TAG_EXISTS:-0}" = "1" ]; then
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
  rm -rf "$TEST_ROOT/.tmp"
  rm -rf "$DOCKER_CONFIG_PATH"
  mkdir -p "$DOCKER_CONFIG_PATH"
  printf '{"auths":{"https://index.docker.io/v1/":{"auth":"test-only"}}}\n' >"$DOCKER_CONFIG_PATH/config.json"
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
  export PATH="$FAKE_BIN:$PATH" CALL_LOG HEAD_FILE FAKE_GH_AUTH_FAIL
  export DOCKER_CONFIG="$DOCKER_CONFIG_PATH"
  printf '\n' | bash scripts/release-docker.sh 2>&1
}

run_resume_release() {
  cd "$TEST_ROOT"
  export PATH="$FAKE_BIN:$PATH" CALL_LOG HEAD_FILE
  export DOCKER_CONFIG="$DOCKER_CONFIG_PATH"
  export FAKE_DOCKER_TAG_EXISTS FAKE_REMOTE_COMMIT FAKE_GH_RELEASE_EXISTS FAKE_REMOTE_TAG_TARGET
  bash scripts/release-docker.sh --resume --version 1.0.5 --yes 2>&1
}

prepare_case
output="$(run_quick_release)"

printf '%s' "$output" | grep -Fq 'NOWEN Blog 快速发布向导'
printf '%s' "$output" | grep -Fq '架构:          multi (linux/amd64,linux/arm64)'
printf '%s' "$output" | grep -Fq 'GitHub Release: on'

docker_push_line="$(grep -n 'docker buildx bake .*--push' "$CALL_LOG" | head -n 1 | cut -d: -f1)"
git_push_line="$(grep -n 'git push origin HEAD:main' "$CALL_LOG" | head -n 1 | cut -d: -f1)"
[ "$docker_push_line" -lt "$git_push_line" ]

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

echo 'Docker release quick wizard passed.'
