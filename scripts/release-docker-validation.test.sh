#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FAKE_BIN="$(mktemp -d)"
TEST_SCRIPT="$(mktemp "$ROOT_DIR/scripts/release-docker.validation.XXXXXX.sh")"
cleanup() {
  rm -rf "$FAKE_BIN"
  rm -f "$TEST_SCRIPT"
}
trap cleanup EXIT

# Windows 工作区可能使用 CRLF；测试副本转为 LF，避免改变仓库文件编码。
tr -d '\r' <scripts/release-docker.sh >"$TEST_SCRIPT"

# 隔离发布脚本的外部依赖，只验证 dry-run 生成的命令。
cat >"$FAKE_BIN/git" <<'EOF'
#!/usr/bin/env bash
case "${1:-} ${2:-}" in
  "branch --show-current") echo main ;;
  "remote get-url") echo 'https://github.com/cropflre/nowen-blog.git' ;;
  "status --porcelain") ;;
  "tag -l") ;;
  "ls-remote "*) exit 2 ;;
  "rev-parse HEAD") echo deadbeef ;;
  "rev-parse "*) exit 1 ;;
  *) exit 0 ;;
esac
EOF

cat >"$FAKE_BIN/docker" <<'EOF'
#!/usr/bin/env bash
if [ "${1:-} ${2:-}" = "buildx version" ]; then
  exit 0
fi
if [ "${1:-} ${2:-}" = "buildx inspect" ]; then
  exit 1
fi
exit 0
EOF

chmod +x "$FAKE_BIN/git" "$FAKE_BIN/docker"

run_dry_release() {
  PATH="$FAKE_BIN:$PATH" bash "$TEST_SCRIPT" \
    --dry-run \
    --no-pull \
    --no-git-push \
    --no-git-tag \
    --no-github-release \
    --image nowen-blog-local \
    --version 99.99.99 \
    --yes
}

output="$({
  unset SESSION_SECRET ADMIN_PASSWORD
  run_dry_release
} 2>&1)"

printf '%s' "$output" | grep -Fq 'SESSION_SECRET=release-validation-session-secret-at-least-32-characters'
printf '%s' "$output" | grep -Fq 'ADMIN_PASSWORD=release-validation-admin-password'
printf '%s' "$output" | grep -Fq 'docker compose config --quiet'
printf '%s' "$output" | grep -Fq 'docker compose -f docker-compose.release.yml config --quiet'

configured_output="$({
  export SESSION_SECRET='must-not-appear-session-secret'
  export ADMIN_PASSWORD='must-not-appear-admin-password'
  export NOWEN_BLOG_VERSION='v98.76.54'
  run_dry_release
} 2>&1)"

if printf '%s' "$configured_output" | grep -Fq 'must-not-appear'; then
  echo '发布日志泄露了真实密钥。' >&2
  exit 1
fi
printf '%s' "$configured_output" | grep -Fq 'NOWEN_BLOG_VERSION=v98.76.54'

echo 'Docker release Compose validation environment passed.'
