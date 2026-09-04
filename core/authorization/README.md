# Authorization Context

## Responsibility

Produce explicit authorization decisions from subject, tenant context, action, resource and current policy/resource state.

## Rules

- Default decision is deny.
- Authentication evidence is not sufficient for authorization.
- Roles aggregate permissions; permissions are the stable application-level authorization vocabulary.
- Tenant membership is validated server-side.
- Sensitive operations re-evaluate current membership, policy, and resource state.
- Authorization decisions are observable without logging secrets or credentials.

## Boundary

Business domains may define domain-specific actions and resource policies through approved contracts, but cannot replace the platform authorization authority.
