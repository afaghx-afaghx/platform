# AFAGHX Security Controls v1

## Purpose

This document defines the minimum security controls for the AFAGHX Ecosystem Platform foundation. It is normative for AFX-CORE and applies to every protected application and domain module.

## Trust controls

1. Protected endpoints are secure by default; public access requires explicit `@AfxPublic()` metadata.
2. Authentication validates JWT signature, issuer, audience, algorithm, expiry, subject, session and authentication-assurance claims.
3. A trusted SecurityContext is established before authorization or resource access.
4. Tenant context supplied by a client is untrusted until server-side membership validation succeeds.
5. Authorization is deny-by-default and requires explicit action/resource policy metadata.
6. Cross-tenant access is never implicit and must use an explicit privileged policy plus audit evidence.

## Credential controls

- Passwords use Argon2id; plaintext passwords are never persisted or logged.
- Refresh credentials are high-entropy opaque values and only their hashes are persisted.
- Refresh rotation is atomic; reuse detection revokes the token family/session.
- JWT access tokens are short-lived and asymmetric-signed with RS256.
- JWTs carry a `kid`; key management must evolve to a JWKS/KMS/HSM-ready provider with rotation overlap.
- Secrets and private keys are environment/secret-manager inputs only and must never be committed.

## Tenant isolation controls

Every tenant-scoped read/write must enforce tenant ownership at the application boundary and, where appropriate, at the persistence/query boundary. Tenant identity must propagate through cache keys, messages, search documents, files and observability attributes. Never authorize based solely on a client-provided tenant identifier.

## Audit controls

Security-significant events must be recorded using the AFX audit service. Audit metadata is sanitized for token, secret, password, authorization, cookie, private-key and refresh-token material. Audit persistence must not make an otherwise valid authentication request fail; audit-write failures must be observable operationally.

## Required automated security tests

- invalid signature, issuer, audience, algorithm and expiry
- missing/invalid authentication assurance
- revoked or expired session
- inactive identity or membership
- tenant breakout / IDOR attempts
- default-deny authorization
- refresh rotation, reuse and concurrent refresh race
- public endpoint bypass only when explicitly annotated
- audit redaction
- outbox atomicity and consumer idempotency

## Release gate

A foundation change is not production-ready until CI validates build, lint, unit/integration/contract tests, Prisma/migration safety, dependency/security scanning, secret detection and relevant tenant/auth authorization tests.
