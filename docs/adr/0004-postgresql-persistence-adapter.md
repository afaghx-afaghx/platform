# ADR-0004: PostgreSQL persistence adapter

## Status
Accepted

## Decision

AFX-CORE remains persistence-agnostic. PostgreSQL is the reference persistence implementation and is isolated in `packages/persistence-postgres`.

The adapter uses explicit SQL through the `postgres` driver rather than an ORM in the security-critical identity/session path. Refresh-token rotation is executed inside one database transaction and locks the presented token row with `FOR UPDATE` before changing state.

## Security invariants

1. Plaintext refresh tokens are never persisted.
2. Token hashes are compared using the stored digest.
3. Rotation is atomic: consume the presented token and issue the successor in the same transaction.
4. Replay of a consumed token revokes the complete refresh-token family and its session.
5. Membership resolution is tenant and organization scoped.
6. Session and identity queries cannot silently cross tenant boundaries.
7. SQL parameters are bound through the driver; application values are never interpolated into SQL text.
8. Core authorization remains the authority; the persistence adapter cannot grant access.

## Consequences

The adapter can evolve independently from Core contracts, and future infrastructure adapters (another database or managed identity store) can implement the same contracts without changing domain authorization semantics.
