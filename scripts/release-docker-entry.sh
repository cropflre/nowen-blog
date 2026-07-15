#!/usr/bin/env bash
set -Eeuo pipefail

# pnpm versions and invocation styles may forward the conventional `--`
# separator to the script itself. Treat one leading separator as metadata,
# not as a release option, so both commands work:
#   pnpm release:docker -v 1.0.5 --arch multi -y
#   pnpm release:docker -- -v 1.0.5 --arch multi -y
if [ "${1:-}" = "--" ]; then
  shift
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/release-docker.sh" "$@"
