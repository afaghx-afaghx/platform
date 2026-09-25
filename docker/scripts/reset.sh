#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"
if [[ ! -f docker/.env ]]; then
  echo "Missing docker/.env. Refusing reset."
  exit 1
fi
echo "WARNING: this removes AFAGHX local Docker volumes."
docker compose --env-file docker/.env -f docker/docker-compose.yml down -v
