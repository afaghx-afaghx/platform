#!/usr/bin/env bash
set -euo pipefail
umask 077

release_dir="${1:-}"
run_id="${2:-}"
if [[ ! "$release_dir" =~ ^/opt/afaghx/releases/[0-9a-f]{40}-[0-9]+$ ]]; then
  echo "Invalid release path; refusing deployment."
  exit 2
fi
if [[ ! "$run_id" =~ ^[0-9]+$ ]]; then
  echo "Invalid deployment run identifier."
  exit 2
fi

bundle="/tmp/afaghx-release-$run_id.tar.gz"
env_source="/tmp/afaghx-env-$run_id"
trap 'rm -f "$bundle" "$env_source" "$0"' EXIT

test -s "$bundle"
test -s "$env_source"
install -d -m 750 /opt/afaghx/releases
mkdir -p "$release_dir"
tar -xzf "$bundle" -C "$release_dir"
install -m 600 "$env_source" "$release_dir/.env"

compose=(
  docker compose
  --project-directory "$release_dir"
  -p afaghx-production
  -f "$release_dir/infrastructure/deploy/compose.production.yaml"
)

# Switch only after a complete source archive and protected environment file exist.
ln -sfn "$release_dir" /opt/afaghx/current
"${compose[@]}" up -d --build --remove-orphans

container_id="$("${compose[@]}" ps -q api || true)"
state="starting"
for _ in $(seq 1 36); do
  if [[ -n "$container_id" ]]; then
    state="$(docker inspect --format '{{.State.Health.Status}}' "$container_id" 2>/dev/null || true)"
  fi
  [[ "$state" == "healthy" ]] && break
  sleep 5
done

if [[ "$state" != "healthy" ]]; then
  "${compose[@]}" logs --no-color api caddy || true
  echo "Local Gateway health failed; orchestrator will attempt rollback."
  exit 1
fi

"${compose[@]}" ps
echo "remote_release=healthy"
