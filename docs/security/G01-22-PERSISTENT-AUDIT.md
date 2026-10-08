# G01-22 — Persistent Security Audit and Retention

**Control:** G01-22  
**Status:** REVIEW_REQUIRED

## Implemented

AFX-CORE now has a PostgreSQL-backed `afx_audit_events` table with:

- stable event identity;
- event type;
- tenant/user/session/family references where available;
- sanitized metadata;
- creation timestamp;
- indexes for time and tenant-oriented retention/access patterns.

`PersistentAfxCore` uses the repository audit sink by default when no custom audit sink is supplied.

## Sanitization boundary

Only the following audit fields are persisted:

`type, userId, tenantId, sessionId, familyId, reason, source, requestId`

Unknown fields and values that are not bounded strings are discarded. Raw access tokens, refresh tokens and passwords are therefore not persisted by the repository audit sink.

## Retention

The repository provides a bounded retention operation with a default of 90 days. The operation rejects unsafe retention periods and deletes rows older than the computed cutoff.

## Closure requirement

This wave provides implementation, deterministic database tests, CI proof and machine-readable evidence. G01-22 remains REVIEW_REQUIRED until the exact CI artifact and retention/access-control posture are reviewed and accepted by the security architecture reviewer.

The audit read surface is intentionally not exposed through the Gateway in this wave; administrative access policy is a separate controlled concern.
