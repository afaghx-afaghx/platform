# ADR-0002: Token and Session Runtime Boundary

## Status
Accepted

## Decision
AFX-CORE treats access tokens and refresh tokens as different security primitives.

Access tokens are short-lived signed credentials validated for issuer, audience, lifetime and an explicit algorithm allow-list. Validation establishes cryptographic claims only; tenant membership is resolved separately from the authoritative membership store.

Refresh tokens are opaque high-entropy bearer secrets. Only a SHA-256 digest is persisted. Every successful refresh rotates the token. Rotation is performed inside a database transaction with row-level locking semantics. Reuse of a previously consumed token revokes the entire refresh-token family and the associated session.

## Rationale
This prevents token replay from becoming a persistent session, avoids treating JWT claims as the source of membership truth, and makes session compromise recoverable through family revocation.

## Required adapter guarantees
- `findForUpdate` must lock the presented refresh-token record within the transaction.
- `rotate` must atomically consume the current token and persist the next digest.
- `revokeFamily` must invalidate every active token in the family.
- Session revocation must be durable and visible to subsequent authorization/session checks.
- Transaction boundaries must be provided by the persistence adapter; the domain security layer must not own a database connection.

## Consequences
The runtime remains framework- and database-adapter-neutral while making the security invariants explicit. PostgreSQL is the initial persistence target, but the core contracts do not expose PostgreSQL-specific APIs.
