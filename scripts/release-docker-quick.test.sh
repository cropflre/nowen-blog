#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_ROOT="$(mktemp -d)"
FAKE_BIN="$TEST_ROOT/fake-bin"
CALL_LOG="$TEST_ROOT/calls.log"

cleanup() {
  rm -rf "$TEST_ROOT"
}
trap cleanup EXIT

mkdir -p "$FAKE_BIN" "$TEST_ROOT/scripts"
cp "$ROOT_DIR/package.json" "$TEST_ROOT/package.json"
cp "$ROOT_DIR/docker-bake.hcl" "$TEST_ROOT/docker-bake.hcl"
cp "$ROOT_DIR/docker-compose.yml" "$TEST_ROOT/docker-compose.yml"
cp "$ROOT_DIR/docker-compose.release.yml" "$TEST_ROOT/docker-compose.release.yml"
cp "$ROOT_DIR/scripts/release-docker.sh" "$TEST_ROOT/scripts/release-docker.sh"

cat >"$FAKE_BIN/git" <<'EOF'
#!/usr/bin/env bash
printf 'git %s\n' "$*" >>"$CALL_LOG"
case "${1:-} ${2:-}" in
  "branch --show-current") echo main ;;
  "status --porcelain") ;;
  "tag -l") ;;
  "ls-remote "*) exit 2 ;;
  "rev-parse HEAD") echo original-head ;;
  "rev-parse "*) exit 1 ;;
  "diff --cached") exit 1 ;;
  *) exit 0 ;;
esac
EOF

cat >"$FAKE_BIN/docker" <<'EOF'
#!/usr/bin/env bash
printf 'docker %s\n' "$*" >>"$CALL_LOG"
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

output="$(
  cd "$TEST_ROOT"
  export PATH="$FAKE_BIN:$PATH" CALL_LOG
  printf '\n' | bash scripts/release-docker.sh 2>&1
)"

printf '%s' "$output" | grep -Fq 'NOWEN Blog 快速发布向导'
printf '%s' "$output" | grep -Fq '架构:          multi (linux/amd64,linux/arm64)'
printf '%s' "$output" | grep -Fq 'GitHub Release: on'

echo 'Docker release quick wizard passed.'
