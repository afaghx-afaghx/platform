# AFAGHX — Step 5 Identity/RBAC Aggregate Repair

## Scope

Repair the remaining canonical SecurityContext gaps identified during discovery:

1. Identity output lacked `email/status`.
2. RBAC aggregate permissions were not exposed in SecurityContext.
3. Gateway had no authoritative aggregate-resolution stage.

## Implementation

- Added Core `getIdentity(userId)`.
- Added Core `getMembershipAggregate(userId, tenantId)`.
- Added persistent repository permission aggregation with tenant-bound membership lookup.
- Gateway now resolves both aggregates from Core and validates identity/membership principal consistency.
- SecurityContext now carries:
  - Identity: `userId/email/status`
  - Membership: `userId/tenantId/roles/permissions/status`
  - RBAC: `allowed/permissions/evaluatedAt`
- Aggregate failure returns `security_context_resolution_failed` instead of falling back.
- Existing Search/Policy paths continue to consume the same Context.

## Security rules

- Tenant authority remains session-derived.
- Request tenant identifiers remain ignored and audited.
- Gateway does not calculate the permission aggregate.
- RBAC permission aggregate and Policy decision remain separate concepts.
- No merge to `main`.

## Proof matrix

| Control | Evidence | Status |
|---|---|---|
| Core Identity aggregate | `aggregate.test.js` | pending fresh CI |
| Persistent Identity/RBAC aggregate | `aggregate.persistence.test.js` | pending fresh CI |
| Gateway aggregate hydration | `security-boundary.test.js` | pending fresh CI |
| Aggregate resolution failure | `security-boundary.test.js` | pending fresh CI |
| Existing Search regression | Search Runtime | pending fresh CI |
| Existing Policy regression | AFX-CORE Security | pending fresh CI |

## Gate

Step 5 is implementation-complete. Fresh CI on the final HEAD is required before declaring Step 5 PROVEN.

Repository-wide Final Gate remains governed by Gate 01. No Main merge.
