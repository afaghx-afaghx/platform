# AFX-CORE

The single trust foundation of AFAGHX.

## Planned modules

- `identity/` — canonical principals and identity lifecycle
- `authentication/` — credentials, sessions, MFA, WebAuthn, recovery and security events
- `authorization/` — permissions, RBAC and policy evaluation contracts
- `organizations/` — organization model
- `memberships/` — membership and role assignment
- `tenant-context/` — validated tenant/organization request context
- `audit/` — security and administrative audit contracts
- `consent/` — consent records and policy
- `trust/` — assurance, verification and risk primitives
- `configuration/` — controlled configuration contracts
- `feature-flags/` — feature exposure contracts
- `module-registry/` — registered platform/domain capability metadata

## Boundary rule

CORE owns trust primitives and contracts. Business domains must not implement competing identity or authentication stores.
