#!/usr/bin/env bash

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="$root_dir/infra/docker/docker-compose.yml"
backup_dir="${BACKUP_DIR:-$root_dir/backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$backup_dir/laudo-$timestamp.archive.gz"
mongo_uri="${MONGO_CONTAINER_URI:-mongodb://mongodb:27017/laudo?replicaSet=rs0}"

mkdir -p "$backup_dir"

docker compose -f "$compose_file" exec -T mongodb \
  mongodump --uri="$mongo_uri" --archive --gzip > "$archive"

sha256sum "$archive" > "$archive.sha256"
printf 'Backup criado: %s\nChecksum: %s.sha256\n' "$archive" "$archive"
