# AFAGHX Threat Model Gates v1

## Threats that must be continuously tested

| Threat | Required control |
|---|---|
| Forged/modified JWT | RS256 verification, issuer/audience/algorithm/expiry checks |
| Stolen access token | Short TTL, session validation, step-up for sensitive actions |
| Refresh-token replay | Hash-at-rest, rotation, race-safe conditional update, family revocation |
| Tenant breakout / IDOR | Server-side membership + organization/tenant validation |
| Privilege escalation | Default-deny authorization and explicit permissions/policies |
| Cross-tenant cache/search leakage | Mandatory tenant scope in keys and projections |
| Secret leakage | Secret scan, sanitized audit/logging, secret-manager boundary |
| Audit tampering/loss | Append-oriented audit design, sanitization, operational monitoring |
| Duplicate events | Inbox/idempotency consumer control |
| Lost events | Transactional outbox and publisher retry |
| Poison messages | Retry policy, DLQ and replay controls |
| Unsafe migration | CI migration validation and backward-compatible rollout discipline |

## Security invariant

An attacker controlling a request must never be able to select a tenant, membership, role or permission outside the server-validated security context merely by changing request parameters or headers.

## Release evidence

Each threat class requires an automated test or a documented infrastructure control before production readiness can be claimed.
