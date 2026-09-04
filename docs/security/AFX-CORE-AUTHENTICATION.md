# AFX-CORE Authentication, Identity & Authorization

## Status

Bootstrap implementation landed in `core/AFX-CORE`. The code is intentionally framework-independent and uses an in-memory repository so security behavior can be tested before choosing the production web/database stack.

## Canonical request flow

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

### 1. Authentication

Password login normalizes the email, verifies the password hash and requires an active tenant membership. Invalid credentials return the same public error regardless of whether the account exists.

### 2. Identity

A user has a stable internal identifier. Email is a login identifier, not the authorization identity. Credentials are stored only as password hashes.

### 3. Tenant context

A session is bound to a tenant. Authorization rejects a request when the resource tenant differs from the authenticated tenant.

### 4. Membership and RBAC

Membership supplies active roles for the selected tenant. Roles map to explicit permissions. Authorization is deny-by-default.

### 5. Tokens

The reference implementation uses cryptographically random opaque bearer tokens. Only SHA-256 token digests are retained in the server-side state; raw tokens are returned once to the caller.

Access tokens expire after 5 minutes. Refresh tokens are long-lived but rotate on every use. Reuse of an already-used refresh token revokes the complete refresh family and its sessions.

This design deliberately avoids implementing JWT signing/verification inside AFX-CORE. If JWT is later required for distributed verification, use a mature JOSE library, asymmetric signing keys, strict issuer/audience/algorithm validation, key rotation and a documented revocation strategy.

## Credential storage rules

- Never store plaintext passwords.
- Never log passwords, access tokens or refresh tokens.
- Never commit secrets or private keys.
- Production password hashing must use a vetted password hashing implementation and calibrated parameters. The bootstrap uses Node's built-in scrypt rather than homemade cryptography.
- Production session/token state must move to a durable, concurrency-safe store.

## Production hardening required before release

- Argon2id or calibrated scrypt via a reviewed production implementation.
- Database-backed identity, membership and session repositories with unique constraints and transactional refresh rotation.
- KMS/HSM-backed signing/key management if JWT or asymmetric service credentials are introduced.
- MFA/WebAuthn and secure recovery flows.
- Login/refresh rate limiting, credential-stuffing defenses and risk controls.
- CSRF protection for cookie-based sessions and secure cookie attributes (`HttpOnly`, `Secure`, appropriate `SameSite`).
- TLS everywhere, security headers and strict CORS policy.
- Service-to-service authentication with workload identity rather than shared static credentials.
- Audit/event persistence with redaction and retention policy.
- Secret scanning, dependency scanning, SAST/DAST and container/IaC scanning in CI.
- Threat model and penetration test before production.

## Security test matrix

The executable suite covers password hashing, credential rejection, access-token expiry, tenant isolation, deny-by-default RBAC, refresh rotation/reuse detection, session revocation and credential/audit redaction.

The next production test layer must add concurrency/race tests, database transaction tests, HTTP integration tests, CSRF tests, rate-limit tests, MFA/recovery abuse tests, authorization bypass/fuzz tests and external penetration testing.
