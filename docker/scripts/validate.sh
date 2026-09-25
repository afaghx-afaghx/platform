#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DOCKER_DIR="$ROOT_DIR/docker"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.yml"
required_files=(
  "$DOCKER_DIR/README.md"
  "$DOCKER_DIR/RUNTIME-CONTRACT.md"
  "$DOCKER_DIR/Dockerfile.experience"
  "$DOCKER_DIR/docker-compose.yml"
  "$DOCKER_DIR/.env.template"
  "$DOCKER_DIR/.dockerignore"
  "$DOCKER_DIR/scripts/start.sh"
  "$DOCKER_DIR/scripts/stop.sh"
  "$DOCKER_DIR/scripts/reset.sh"
  "$DOCKER_DIR/scripts/validate.sh"
)
for file in "${required_files[@]}"; do
  [[ -f "$file" ]] || { echo "MISSING: $file"; exit 1; }
done
grep -Fq 'FROM node:22-bookworm-slim AS build' "$DOCKER_DIR/Dockerfile.experience"
grep -Fq 'FROM node:22-bookworm-slim AS runtime' "$DOCKER_DIR/Dockerfile.experience"
grep -Fq 'CMD ["node", "server.js"]' "$DOCKER_DIR/Dockerfile.experience"
grep -Fq 'pgvector/pgvector:pg16' "$COMPOSE_FILE"
grep -Fq '  redis:' "$COMPOSE_FILE"
grep -Fq '  minio:' "$COMPOSE_FILE"
grep -Fq '  meilisearch:' "$COMPOSE_FILE"
grep -Fq '  experience:' "$COMPOSE_FILE"
grep -Fq 'healthcheck:' "$COMPOSE_FILE"
grep -Fq 'afaghx-runtime:' "$COMPOSE_FILE"
if grep -Eq 'POSTGRES_PASSWORD:[[:space:]]+[^$[:space:]][^[:space:]]*' "$COMPOSE_FILE"; then
  echo "FAIL: committed PostgreSQL credential value detected."
  exit 1
fi
if grep -Eq 'MINIO_ROOT_PASSWORD:[[:space:]]+[^$[:space:]][^[:space:]]*' "$COMPOSE_FILE"; then
  echo "FAIL: committed MinIO credential value detected."
  exit 1
fi
if grep -Eq '^(POSTGRES_PASSWORD|MINIO_ROOT_PASSWORD)=[^[:space:]]+$' "$DOCKER_DIR/.env.template"; then
  echo "FAIL: credential value detected in .env.template."
  exit 1
fi
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose --env-file "$DOCKER_DIR/.env.template" -f "$COMPOSE_FILE" config --quiet
  echo "COMPOSE_CONFIG=PASS"
else
  echo "COMPOSE_CONFIG=NOT_EXECUTED (Docker Compose unavailable in validation environment)"
fi
echo "STATIC_VALIDATION=PASS"

if grep -RIn --exclude-dir=.git --exclude-dir=node_modules --fixed-strings ".env.example" "$DOCKER_DIR"; then
  echo "FAIL: stale .env.example reference detected under docker/."
  exit 1
fi
