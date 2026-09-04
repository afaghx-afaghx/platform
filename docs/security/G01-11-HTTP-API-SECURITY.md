# G01-11 HTTP/API Security Boundary

**Status:** IN PROGRESS — implementation submitted for CI evidence

## Architectural invariant

Every protected HTTP request must follow:

`Authentication → Identity → Tenant/Organization Context → Membership → RBAC/Permission → Policy → Resource State`

The HTTP boundary must not authenticate, identify, authorize, or resolve tenants independently of AFX-CORE.

## Baseline implementation

`core/AFX-CORE/src/http-security.js` provides a framework-neutral adapter that:

1. Extracts exactly one well-formed `Authorization: Bearer <opaque-token>` credential.
2. Delegates token validation to `AfxCore.authenticateAccessToken()`.
3. Delegates tenant-scoped permission evaluation to `AfxCore.authorize()`.
4. Prevents the protected handler from executing when authentication or authorization fails.
5. Returns generic `401` responses for missing/invalid credentials and `403` for authenticated-but-unauthorized access.
6. Marks error responses `Cache-Control: no-store`.

## Evidence contract

G01-11 may become DONE only after all of the following are verified on the protected branch:

- implementation exists in AFX-CORE;
- HTTP integration tests pass;
- cross-tenant access is denied;
- missing/malformed/expired/revoked credentials are denied;
- unauthorized permissions are denied without handler execution;
- CI records a successful test run and reviewable evidence artifact;
- no domain-specific security authority bypasses AFX-CORE.

## Explicit non-goals for this baseline

TLS termination, strict CORS policy, CSRF/cookie policy, rate limiting, browser WebAuthn, KMS/HSM rotation, and production workload identity remain separate controls in G01-17 through G01-21 and must not be represented as completed by this change.
