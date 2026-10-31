# AFAGHX Distributed Resilience Foundation

## Redis distributed rate limiting

The Gateway uses a Redis-backed sliding-window limiter when `REDIS_URL` is configured. It uses a shared Redis TCP/TLS endpoint and an atomic Lua EVAL operation on a pooled RESP2 client. Rate limits are evaluated by client IP and, after authentication, by tenant/user principal. Identifiers are SHA-256 hashed before being used as Redis keys.

Production startup fails closed unless `REDIS_URL` is configured or a rate limiter is explicitly injected. In-memory limiting remains a development/test fallback only and is not distributed.

Supported URLs:
- `redis://[:password@]host:6379/0`
- `rediss://[:password@]host:6380/0`

Set `REDIS_POOL_SIZE` to a value from 1 to 32. TLS certificate verification remains enabled. Redis failure yields HTTP 503; it never silently falls back to per-process counters in production.

## Transactional outbox

Apply `domains/runtime/migrations/002-transactional-outbox.sql` before deploying the Gateway build that writes Domain events. The Domain API appends the event using the very same PostgreSQL client/transaction as the domain record and idempotency response.

The dispatcher claims work with `FOR UPDATE SKIP LOCKED`, uses a lease, and retries with exponential backoff. After the configured maximum attempts, the event becomes `dead_letter`. Publishing is at-least-once: a worker may crash after publishing but before marking the row published. Stream consumers MUST deduplicate by `metadata.eventId` using a durable inbox/unique constraint.

The Redis Streams publisher is an adapter, not an assumption that Redis Streams is the permanent system of record. PostgreSQL outbox rows remain authoritative until marked published.

## k6 load validation

`tests/load/gateway-smoke.js` exercises the canonical health route through Gateway and Redis. The CI profile is a bounded regression check and is not a production capacity certification. Record VUs, duration, request rate, p95/p99, error rate, Redis pool size, Redis latency and PostgreSQL utilization with every capacity claim.

Do not describe the platform as capable of 100,000 concurrent users until a separately provisioned soak/stress test with production-equivalent deployment, Redis topology, DB pool, network, telemetry and realistic authenticated traffic proves it.
