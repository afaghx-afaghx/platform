# Membership Context

Membership is the authoritative relationship between an identity and an organization/tenant access boundary.

## Invariants

- Membership has an explicit lifecycle state.
- Membership grants are evaluated server-side.
- Client-provided tenant IDs never create membership.
- Membership changes are auditable and security-sensitive.
- Revoked membership must stop authorization for subsequent protected operations.
