# ADR-DATA-001 — Tenant-scoped domain persistence and atomic idempotency

- **Status:** Proposed for review
- **Date:** 2026-10-31
- **Scope:** Domain persistence boundary, tenant isolation, write idempotency
- **Decision owners:** AFAGHX architecture governance

## Context

The domain runtime previously kept tenant ownership only inside a JSON payload. PostgreSQL reads selected records by record id and application code checked tenant ownership after retrieving the row. Domain creation also stored the idempotency response after the business insert in a separate statement/transaction. Concurrent requests could therefore both perform the business write before the unique idempotency row was persisted.

Payment amounts were also converted to JavaScript `Number` values at the persistence boundary, which is not an exact decimal representation.

## Decisions

1. Every domain table has a first-class `tenant_id` column. The tenant identifier is derived from the authenticated SecurityContext, never trusted from the caller.
2. Domain adapter reads and state updates require a tenant id and include it in the SQL predicate. Product queries pass the Gateway SecurityContext tenant to persistence.
3. State transitions use compare-and-set semantics: the update includes the previously observed state. A stale transition cannot silently overwrite a concurrent transition.
4. Domain creation requires a syntactically valid Idempotency-Key (8–200 characters) and a persistent atomic idempotency implementation. The request fingerprint is a SHA-256 hash of canonicalized method, domain and payload.
5. PostgreSQL reserves the tenant/key pair, writes the domain record, and stores the response in one transaction. Concurrent duplicates replay the committed response; reusing the same key for a different request returns HTTP 409. If the idempotency store is unavailable, the API fails closed with HTTP 503.
6. Payment amounts are decimal strings at the API and JavaScript boundary and are stored in PostgreSQL NUMERIC. JSON floating-point amounts are rejected.
7. Existing domain rows are migrated additively. Values with a known `payload.tenantId` are backfilled. Rows without an unambiguous tenant remain `tenant_id = NULL`, cannot be read through tenant-scoped code, and require authorized reconciliation; no tenant is guessed.

## Migration and rollout

1. Take and verify a database backup before applying the migration.
2. Apply `domains/runtime/migrations/001-tenant-scoped-domain-persistence.sql`.
3. Review counts for migrated, quarantined and duplicate/conflicting records in every domain table.
4. Reconcile quarantined legacy rows only from a trustworthy source of record.
5. Once every legacy row has an approved tenant, validate the generated `*_tenant_id_present` constraints and optionally promote `tenant_id` to `NOT NULL`.
6. Deploy the tenant-scoped adapter/API changes after schema compatibility is confirmed.
7. Verify tenant-crossing read denial, idempotent replay, key-payload conflict, rollback-on-failure and compare-and-set transition behavior in staging.

The migration deliberately uses `NOT VALID` checks to preserve legacy rows while enforcing the invariant for all new or updated rows. Do not run an unreviewed mass tenant assignment.

## Consequences

- Tenant boundaries become directly queryable and indexable in PostgreSQL.
- The API no longer depends on a best-effort read-then-write idempotency pattern.
- Legacy records without known tenant ownership are quarantined instead of exposed.
- Payment amounts retain decimal text fidelity through the adapter.
- Domain creation requires a transactional repository adapter and cannot silently fall back to an in-memory or non-atomic idempotency store.

## Explicit non-claims and follow-up work

- This ADR does not claim PostgreSQL Row-Level Security (RLS) is enabled. RLS policies and a non-owner runtime database role remain a separate defense-in-depth task.
- This ADR does not certify production performance, database capacity, high availability, disaster recovery or 100,000 concurrent users.
- A transactional outbox for audit/event publication, financial ledger/reconciliation, distributed rate limiting, and production KMS/workload identity remain separate workstreams.
- The existing Storefront Prisma SQLite scaffold and static demo catalog are not made production-ready by this change; their retirement or migration into the canonical API boundary requires a separate reviewed change.

## Acceptance evidence

- Unit tests cover tenant requirement, tenant isolation, same-key replay, different-payload conflict, concurrent duplicate create and fail-closed behavior.
- PostgreSQL integration tests cover all domain tables, tenant-scoped reads, exact decimal values, concurrent idempotency serialization and legacy migration behavior.
- The exact PR head must pass the relevant GitHub Actions workflows before this decision is accepted.
