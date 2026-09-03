# AFX-CORE Next Implementation Gate

The next implementation gate is intentionally security-first.

1. Add executable NestJS modules and dependency injection wiring.
2. Add Prisma migrations and deterministic integration-test fixtures.
3. Implement authorization decision service with default-deny semantics.
4. Implement tenant-context guard independent of client claims.
5. Add audit events for authentication, session lifecycle, authorization and membership changes.
6. Add MFA/WebAuthn and recovery flows without weakening password authentication.
7. Add rate limiting, risk signals and abuse controls.
8. Add browser-safe refresh-cookie transport with CSRF protection where cookies are used.
9. Add key lifecycle management: versioned `kid`, rotation, KMS/HSM integration and emergency revocation.
10. Add CI quality/security gates and only then promote the PR out of draft.

No domain module should be built on top of an incomplete trust foundation.
