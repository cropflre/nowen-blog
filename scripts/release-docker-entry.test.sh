#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

without_separator="$(bash scripts/release-docker-entry.sh --help)"
with_separator="$(bash scripts/release-docker-entry.sh -- --help)"

printf '%s' "$without_separator" | grep -q '用法:'
printf '%s' "$with_separator" | grep -q '用法:'

echo 'Docker release CLI argument compatibility passed.'
