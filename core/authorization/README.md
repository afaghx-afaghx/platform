# AFX-CORE Authorization

Authorization decides whether an authenticated principal may perform an action on a resource within a tenant.

## Decision inputs

`principal + tenant + membership + roles + permissions + policy + resource state + action`

## Rules

- Deny by default.
- Explicit permission is required.
- Tenant membership is mandatory for tenant-scoped resources.
- Roles aggregate permissions; policy may further restrict them.
- Client-supplied roles, permissions, and tenant identifiers are never trusted by themselves.
- Authorization context includes principal ID, organization ID, membership ID, roles, permissions, session ID, and request ID.

The authorization layer is independent from credential verification and is owned by AFX-CORE.