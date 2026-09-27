#!/usr/bin/env bash
set -euo pipefail

compose_file="infra/docker/docker-compose.yml"
docker compose -f "$compose_file" up -d mongodb mongo-init

for attempt in {1..30}; do
  if docker compose -f "$compose_file" exec -T mongodb mongosh --quiet --eval 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; then
    echo "MongoDB pronto para desenvolvimento."
    exit 0
  fi
  sleep 1
done

echo "MongoDB não ficou pronto em 30 segundos. Confira os logs com docker compose -f $compose_file logs mongodb mongo-init." >&2
exit 1
