# AFAGHX Docker Foundation

## Purpose
The docker/ directory is the canonical local container-runtime packaging surface for AFAGHX. Docker packages verified runtimes and local infrastructure; it does not own identity, authorization, tenant policy, domain rules, or persistence governance.

## Verified runtime scope
- Experience Web: experience/web/server.js -> node server.js -> port 3000.
- AFX-CORE: no standalone server entrypoint/start script; no Dockerfile.
- AFX-PLATFORM Gateway: runtime factory exists, but no standalone process entrypoint/listen contract; no Dockerfile.
- See RUNTIME-CONTRACT.md for evidence.

## Local stack
- PostgreSQL 16 with pgvector
- Redis 7
- MinIO
- Meilisearch
- Experience Web

Core and Platform are intentionally not represented as containers until repository-native runnable service contracts exist.

## Run
1. Copy docker/.env.example to docker/.env.
2. Set local PostgreSQL and MinIO credentials.
3. Run ./docker/scripts/start.sh.
4. Inspect with docker compose --env-file docker/.env -f docker/docker-compose.yml ps.
5. Stop with ./docker/scripts/stop.sh.
6. Reset local volumes with ./docker/scripts/reset.sh.

## Validation
Run ./docker/scripts/validate.sh. It validates the required structure and, when Docker Compose is available, runs docker compose config. Missing Docker is reported and is not treated as runtime GREEN.

## Boundaries
- Experience remains presentation-only.
- Canonical API remains https://api.afaghx.com.
- No frontend-to-database path.
- Core remains identity/trust authority.
- Domain rules and domain persistence remain outside Docker.
- Production Kubernetes is outside this phase.
- Secrets are supplied locally and never committed.

## Evidence status
This PR is not Docker LOCKED. Static validation is configuration evidence; full build/start/health/integration proof requires a controlled Docker-capable run or CI.
