# AFX-CORE authentication implementation

This slice is intentionally narrow and security-first. It establishes the executable trust path before domain features.

## Implemented
- PostgreSQL/Prisma identity, organization, tenant, membership, role and permission model.
- Argon2id password verification/hashing service.
- Short-lived RS256 access tokens with issuer/audience/subject/session/tenant claims.
- Opaque high-entropy refresh tokens stored only as SHA-256 hashes.
- Refresh-token rotation with atomic compare-and-swap and reuse/family revocation.
- Session revocation on logout.
- Server-side tenant membership validation.
- Explicit security-context resolver for protected request pipelines.

## Security boundary
The client may request a tenant context, but the tenant ID is never accepted as authorization evidence. AFX-CORE validates the authenticated subject's active membership for that tenant before returning a security context.

## Not yet production-complete
MFA/WebAuthn, recovery workflows, rate/risk controls, audit persistence on every security transition, asymmetric key rotation infrastructure/KMS integration, CSRF middleware for cookie transport, and full authorization-policy evaluation remain explicit next increments.
