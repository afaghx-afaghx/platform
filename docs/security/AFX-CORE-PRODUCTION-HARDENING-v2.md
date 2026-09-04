# AFX-CORE Production Hardening v2

## Implemented in this increment

### PostgreSQL
PostgreSQL/Prisma remains the authoritative transactional store for identity, membership, RBAC, sessions, refresh credentials, audit, MFA factors and recovery tokens. Refresh rotation uses a conditional transactional update so concurrent consumers cannot both spend the same credential.

### Redis
Redis is an ephemeral security coordination/session/rate-limit store. PostgreSQL remains authoritative. Redis keys are namespaced and session data has explicit TTLs. The adapter connects lazily and coalesces concurrent connection attempts.

### API / HTTP security
The NestJS API has a public health probe and a global HTTP security middleware. Requests receive bounded correlation IDs and no-store headers; Helmet supplies security headers. Public routes require explicit `@AfxPublic()` metadata. Protected routes pass through the security-context guard.

### MFA
TOTP is implemented with RFC 6238 semantics. MFA secrets are generated with the platform CSPRNG and stored only as encrypted ciphertext. Login requires the active TOTP factor when one exists and upgrades the resulting authentication assurance to `aal2`.

### Recovery
Recovery credentials are 48-byte opaque random values. Only SHA-256 digests are persisted. Recovery requests return a generic response to prevent account enumeration. Consuming a credential is a single-use transaction that changes the password and revokes active sessions/refresh credentials. Delivery of the raw recovery token is deliberately delegated to the notification/email platform boundary.

### Key management
JWT signing uses a `kid` and an explicit key-provider boundary. `KeyManager` provides public-key registration and JWKS representation. Production private-key operations belong behind a KMS/HSM provider; private key material must never be committed or stored as ordinary application data.

### Security testing
The repository now contains MFA/recovery tests, HTTP-security tests, authorization property/fuzz tests, and refresh-rotation concurrency tests. CI additionally runs dependency audit and secret scanning.

### SAST / DAST
CodeQL is configured for JavaScript/TypeScript SAST. OWASP ZAP baseline DAST probes the running API health surface in an ephemeral PostgreSQL-backed CI environment. DAST is a baseline gate, not a substitute for authenticated attack-path testing.

## Remaining production gates

- Full authenticated DAST against login, refresh, MFA, recovery and authorization paths.
- WebAuthn/passkeys.
- KMS/HSM-backed signing implementation and automated key rotation overlap.
- Distributed Redis-backed rate limiting wired into all ingress replicas.
- CSRF protection for any browser cookie-authenticated state-changing route.
- Password breach/risk controls and adaptive login protection.
- Initial Prisma baseline migration and migration rollback verification.
- Backup/restore and disaster-recovery evidence.
- Observability alerts for audit/Redis/KMS failures.

The foundation is therefore **hardened but not declared production-ready** until the remaining gates have executable evidence.
