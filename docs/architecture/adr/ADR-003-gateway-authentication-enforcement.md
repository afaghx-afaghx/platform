# ADR-003 — Gateway Authentication Enforcement

- **Status:** Proposed
- **Date:** 2026-09-27
- **Branch:** `feat/gateway-authn-enforcement`
- **Base Main SHA:** `15a23125052fe511714f1e5a3ff3f4698752fef7`

## Context

The Gateway called `security.process()` with AFX-CORE authentication and authorization callbacks, but the existing `process()` implementation never invoked those callbacks. Protected requests therefore crossed the boundary without actual authentication enforcement.

The real AFX-CORE contract on Main is session-based:

`authenticateAccessToken(token) -> { userId, tenantId, sessionId, roles }`

The Core method validates the persisted session, expiry, revocation, user state, and active membership. The current Core contract does not expose `authenticatedAt`, `expiresAt`, a complete identity aggregate, an aggregate permission list, or a Policy evaluation API.

## Decision

1. **Gateway remains the enforcement boundary.** It invokes AFX-CORE for authentication and constructs the trusted context; it does not become the security source of truth.
2. **Protected routes require a valid Bearer token.** A failed Core authentication maps to HTTP 401 and stops processing.
3. **Public routes are explicit exceptions:** OPTIONS, `GET /v1/health/core`, `POST /v1/auth/login`, and `POST /v1/auth/refresh`. These routes do not receive a SecurityContext because they are the bootstrap/monitoring surface.
4. **Tenant authority is the Core session principal only.** Query/header tenant identifiers are never accepted as authority. When present on protected requests they are ignored and audited.
5. **SecurityContext is deeply immutable.** Nested objects and roles are frozen; the Request property is defined as non-writable and non-configurable.
6. **Current Core contract gaps remain explicit.** Missing identity enrichment, aggregate RBAC permissions, policy evaluation, and token timestamps are represented as partial/null values rather than fabricated data.
7. **Search integration is deferred.** Search must consume the same SecurityContext in its own repair step and is not changed by this ADR.
8. **No Main merge is authorized by this ADR.**

## Canonical Step 2 Context

```text
REQUEST
  -> API GATEWAY / security-boundary
  -> AFX-CORE.authenticateAccessToken()
  -> trusted session principal
  -> frozen SecurityContext
  -> protected handler
```

The Step 2 Context contains:

- `authn.subject`
- `authn.method = session`
- `authn.sessionId`
- `tenant.tenantId`
- `tenant.resolvedFrom = session`
- `membership.userId`
- `membership.tenantId`
- `membership.roles`
- `membership.status = active`
- `identity.userId`
- `rbac.evaluatedAt = null`
- `policy = null`
- trace request identifier

The following are deliberately **not fabricated**:

- `authn.authenticatedAt = null`
- `authn.expiresAt = null`
- `identity.email`
- `identity.status`
- aggregate RBAC permission list
- Policy decision/IDs/reasons

## Consequences

- Authentication is enforced at the Gateway before protected resource routing.
- Existing Core authentication remains the single security authority.
- Downstream consumers have one trusted, immutable tenant/user context.
- Policy, identity enrichment, and aggregate RBAC remain explicit follow-up contracts rather than hidden Gateway logic.
- Existing Product code still performs its own Core authentication; removing that duplicate authentication path is outside Step 2 and must be handled by a later contract-controlled repair.

## Verification required before merge

- Gateway security unit tests for missing, fake, and expired credentials.
- Query/header tenant ignore + audit tests.
- Tenant-mismatch and RBAC-deny helper tests.
- PostgreSQL-backed runtime integration proof.
- CI evidence attached to the Draft PR.
- Final merge remains blocked until the broader Security Final Gate is proven.
