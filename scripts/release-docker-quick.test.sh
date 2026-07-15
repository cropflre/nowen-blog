#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_ROOT="$(mktemp -d)"
FAKE_BIN="$TEST_ROOT/fake-bin"
CALL_LOG="$TEST_ROOT/calls.log"
HEAD_FILE="$TEST_ROOT/head"

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
  "ls-remote "*) exit 2 ;;
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
if [ "${1:-} ${2:-}" = "release view" ]; then
  exit 1
fi
exit 0
EOF

cat >"$FAKE_BIN/curl" <<'EOF'
#!/usr/bin/env bash
case "$*" in
  *'tags?page_size='*) printf '{"results":[]}' ;;
  *) printf '404' ;;
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
  export PATH="$FAKE_BIN:$PATH" CALL_LOG HEAD_FILE
  printf '\n' | bash scripts/release-docker.sh 2>&1
}

prepare_case
output="$(run_quick_release)"

printf '%s' "$output" | grep -Fq 'NOWEN Blog 快速发布向导'
printf '%s' "$output" | grep -Fq '架构:          multi (linux/amd64,linux/arm64)'
printf '%s' "$output" | grep -Fq 'GitHub Release: on'

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

echo 'Docker release quick wizard passed.'
