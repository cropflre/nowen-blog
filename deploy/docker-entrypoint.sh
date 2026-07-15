#!/bin/sh
set -eu

mkdir -p /app/data/uploads /app/backups /run/nginx /var/log/supervisor
chown -R node:node /app/data /app/backups
chmod 0755 /app/data /app/data/uploads /app/backups

exec "$@"
