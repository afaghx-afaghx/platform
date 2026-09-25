#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"
ENV_FILE="docker/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy docker/.env.example and set local credentials."
  exit 1
fi
docker compose --env-file "$ENV_FILE" -f docker/docker-compose.yml up -d --build
