# AFX-CORE Security Test Plan v1

## Authentication

- Invalid credentials return a generic authentication failure.
- Disabled/suspended identities cannot authenticate.
- Access tokens reject invalid signature, issuer, audience, algorithm, expiry, or required claims.
- Revoked sessions cannot be used for sensitive operations.

## Refresh lifecycle

- Refresh credentials are never stored in plaintext.
- Rotation is atomic.
- A used refresh credential cannot be replayed.
- Reuse detection revokes the complete session family.
- Expired refresh credentials are rejected.
- Concurrent refresh attempts cannot mint two valid descendants from one active token.

## Authorization

- Authentication evidence never grants authorization by itself.
- Unknown actions/resources deny by default.
- Suspended/revoked memberships deny access.
- Tenant mismatch denies access.
- Sensitive operations re-evaluate current membership and policy state.

## Tenant isolation

- A user cannot access another tenant by changing a request header or URL identifier.
- Tenant scope is mandatory for tenant-scoped resources.
- Cross-tenant operations require explicit privileged policy and audit evidence.

## Security regression gates

CI must eventually include unit, integration, contract and E2E security suites plus dependency, secret, container and IaC scanning. Production deployment is blocked when a mandatory security gate fails.
