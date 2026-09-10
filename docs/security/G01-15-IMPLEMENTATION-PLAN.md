# G01-15 — WebAuthn / Passkeys Implementation Plan

Status: IN PROGRESS

## Scope

G01-15 is the WebAuthn / Passkeys security-hardening control in AFX-CORE. Domain implementation remains frozen until Gate 01 is GREEN.

## Current implementation

- RP-ID and exact origin policy enforcement.
- HTTPS-only origins, with localhost HTTP permitted only for local browser evidence.
- 32-byte cryptographically random, five-minute challenges.
- ES256 / P-256 credential parsing and signature verification.
- User-presence and user-verification enforcement.
- Sign-counter regression detection.
- Credential listing and explicit revocation.
- AFX-CORE facade methods for registration and authentication operations.
- Deterministic unit/security tests.
- Real Chromium virtual-authenticator evidence harness wired into CI.

## Closure requirements

A G01-15 DONE decision requires all of the following:

1. WebAuthn registration and authentication enforce configured RP ID and exact allowed origins.
2. Challenges are cryptographically random, single-use, and expire deterministically.
3. Credential public keys, challenge state, revocation state, and sign counters are durable in PostgreSQL.
4. Authentication validates client-data type/challenge/origin, RP-ID hash, user presence, user verification, signature, and sign-counter policy.
5. Credential registration rejects duplicate credential IDs and authentication rejects revoked credentials.
6. WebAuthn authentication is integrated with the existing AFX-CORE identity/session issuance boundary; it does not create a competing token/session system.
7. Deterministic unit and persistence/integration tests pass.
8. Real Chromium + virtual-authenticator browser evidence passes in CI.
9. CI captures reviewable evidence artifacts tied to the tested commit.
10. Production RP ID/origin and HTTPS constraints are explicit configuration; production cryptographic material is not source-controlled.

## Explicit non-goals

- No new domain bounded context.
- No direct database access from clients.
- No independent WebAuthn token/session mechanism outside AFX-CORE.
- No claim of production readiness from unit tests alone.

## Acceptance decision

Until every closure requirement has implementation, automated-test, CI, and evidence proof, G01-15 remains IN PROGRESS.
