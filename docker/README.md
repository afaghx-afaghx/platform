# AFAGHX Docker Foundation

`docker/` is the canonical runtime-packaging surface for AFAGHX development, integration testing, and reproducible local infrastructure.

## Boundary

Docker packages and runs infrastructure dependencies; it does not own business logic, authentication authority, authorization policy, tenant rules, domain invariants, or persistence governance.

Canonical architecture remains: EXPERIENCE → PLATFORM / DOMAIN → CORE.

## Baseline runtime dependencies

- PostgreSQL 16 with pgvector
- Redis 7
- MinIO for S3-compatible object storage
- Meilisearch for the initial search baseline
- Redpanda for event infrastructure

Application services are not fabricated here. A service container may be added only when the corresponding runtime artifact and health contract exist.

## Compose profiles

- dev: reusable local infrastructure
- test: isolated test infrastructure with deterministic ports and no production credentials

## Safety

- no production secrets
- no hard-coded production credentials
- no direct frontend-to-database architecture
- no cross-domain database ownership
- health checks are explicit
- persistent volumes are local development concerns only
- production orchestration remains under infrastructure/

## Evidence

Compose parsing is not runtime proof. Build/start/health/integration evidence must be produced by CI or a controlled runtime environment before this layer is marked LOCKED.
