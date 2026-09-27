#!/usr/bin/env bash

set -euo pipefail

if [[ "${1:-}" != "--confirm" || -z "${2:-}" ]]; then
  echo "Uso: $0 --confirm caminho/para/backup.archive.gz"
  echo "A restauração substitui os dados existentes do banco laudo."
  exit 1
fi

archive="$2"
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="$root_dir/infra/docker/docker-compose.yml"
mongo_uri="${MONGO_CONTAINER_URI:-mongodb://mongodb:27017/laudo?replicaSet=rs0}"

if [[ ! -f "$archive" ]]; then
  echo "Arquivo de backup não encontrado: $archive" >&2
  exit 1
fi

if [[ -f "$archive.sha256" ]]; then
  (cd "$(dirname "$archive")" && sha256sum -c "$(basename "$archive").sha256")
else
  echo "Aviso: checksum não encontrado; continuando por confirmação explícita." >&2
fi

docker compose -f "$compose_file" exec -T mongodb \
  mongorestore --uri="$mongo_uri" --archive --gzip --drop < "$archive"

echo "Restauração concluída. Valide o fluxo da aplicação antes de liberar o ambiente."
