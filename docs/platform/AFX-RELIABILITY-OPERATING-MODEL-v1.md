# AFX Reliability Operating Model v1

## Event reliability
All cross-boundary events use the versioned event envelope. Producers persist business state and the corresponding outbox record in one database transaction. A publisher claims pending rows with `FOR UPDATE SKIP LOCKED`, increments attempts, publishes through a transport adapter, and marks success. Consumers record `(consumerName,messageId)` in Inbox before processing; duplicates are acknowledged without reprocessing.

## Failure handling
Retryable transport failures use bounded exponential backoff. Poison messages move to a dead-letter state after the configured attempt budget. Replay is an explicit operational action and must be audited. No consumer may spin indefinitely on one message.

## API reliability
The HTTP layer provides request correlation and a canonical error envelope. Idempotency keys are required for externally retried state-changing operations that are not naturally idempotent. Rate limits and risk controls belong at the platform boundary and must be distributable in production (Redis or an equivalent shared store), not process-local.

## Database operations
Prisma migrations are the source of truth for schema evolution. CI must validate the schema and apply migrations against a clean PostgreSQL service before build/test. Destructive migrations require review and a rollback/restore plan.

## Observability
Every request carries a correlation identifier. Authentication, authorization, audit persistence, event publication and critical domain operations expose structured operational signals without recording secrets. Readiness includes required persistence dependencies; liveness does not.

## Recovery objectives
Each production workload must declare RPO/RTO, backup frequency, restore verification, dependency failure behavior and incident ownership before production approval.
