# Security Context Contract v1

A validated request context produced by AFX-CORE and consumed by protected platform/domain capabilities.

## Required fields

- `userId`
- `identityId`
- `sessionId`
- `tenantId`
- `organizationId`
- `membershipId`
- `roles[]`
- `permissions[]`
- `authenticationMethod`
- `authenticationLevel`
- `policyContext`

## Rules

1. Context is created only after successful authentication.
2. Tenant and organization values must be validated against the authenticated identity's membership.
3. Consumers must not accept an unvalidated tenant context from arbitrary client input.
4. Authorization is evaluated again for protected resource operations.
5. Security context must never contain raw passwords, refresh tokens, private keys or other secrets.
6. The contract is versioned; incompatible changes require a new version and migration plan.
