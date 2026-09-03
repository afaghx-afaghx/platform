# Security Context Contract

AFAGHX treats security context as a platform primitive.

## Canonical model

```text
Principal
  └─ Identity
      └─ Active Tenant Context
          └─ Membership
              └─ Permissions / Roles
                  └─ Policy Decision
                      └─ Resource Access
```

## Required properties

- The principal must be authenticated before protected access.
- The active tenant must be explicit for tenant-scoped operations.
- Membership must be evaluated against the active tenant.
- Authorization must be deny-by-default.
- Policy decisions must be attributable and auditable where risk requires it.
- Correlation and request identifiers must survive downstream calls.
- Services must not trust client-supplied roles, tenant IDs, or authorization decisions without verification.

## Token boundary

The future authentication implementation must separate credential verification, session lifecycle, token issuance, and authorization. Access tokens are credentials for APIs, not a replacement for policy evaluation. Refresh-token handling must support rotation and revocation. Secrets and signing keys are runtime-managed and never committed.

This document is an architectural contract, not a claim that the production authentication service already exists.
