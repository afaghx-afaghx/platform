# G01-14 — MFA Foundation

**Status: IN PROGRESS — foundation implemented; persistence, browser integration, production key-management and final security review remain open.**

## Objective

Provide one AFX-CORE MFA authority for enrollment, challenge verification, recovery and revocation without creating a domain-specific authentication silo.

## Implemented foundation

- TOTP using SHA-1, 6 digits, 30-second period and ±1 time-step verification window.
- MFA enrollment generates a 160-bit secret and ten one-time recovery codes.
- The TOTP secret is encrypted at rest with AES-256-GCM using a runtime-supplied 32-byte key. No MFA encryption key is committed to the repository.
- Recovery codes are stored only as SHA-256 digests.
- Enrollment is two-step: begin enrollment, then confirm with a valid TOTP before MFA becomes enabled.
- Password authentication for MFA-enabled users returns a short-lived, one-time MFA challenge instead of access/refresh tokens.
- MFA challenge lifetime is five minutes and is capped at five failed attempts.
- A successful recovery code is consumed immediately and cannot be reused.
- MFA disablement revokes active sessions and refresh families and invalidates outstanding MFA challenges.
- Audit events contain identifiers and outcomes only; raw TOTP secrets and recovery codes are excluded.

## Security boundary

MFA is an AFX-CORE concern. Domains must consume the canonical authentication context and must not implement their own MFA, identity, session or token authority.

## Current limitations

1. The current implementation is an in-memory foundation; durable PostgreSQL MFA persistence is required before production closure.
2. Runtime key injection is intentionally used as a temporary boundary. G01-20 must provide approved KMS/HSM-backed key management and rotation before production closure.
3. Browser-level WebAuthn/passkey coverage is handled by G01-15 and is not substituted by this TOTP foundation.
4. Account recovery policy must be aligned with G01-16 so recovery cannot bypass stronger authentication or tenant authorization.
5. Rate limiting and credential-stuffing controls must be closed under G01-17.

## Evidence

- Test: `core/AFX-CORE/test/g01-14-mfa-foundation.test.js`
- CI job: `security-tests`
- CI artifact: `afx-core-security-evidence-${GITHUB_RUN_ID}`
- Acceptance scope: enrollment, TOTP challenge, one-time recovery code, challenge expiry/attempt controls, audit redaction and session revocation.

## Closure criteria

G01-14 may become `DONE` only after:

- deterministic CI tests pass;
- durable PostgreSQL MFA state and migration safety are implemented;
- secret encryption is connected to the approved key-management boundary;
- MFA abuse/recovery scenarios are tested against the real HTTP/API path;
- evidence is captured from CI and production-like infrastructure;
- security architecture review is recorded.

Until then, G01 remains RED/OPEN and Domain Freeze remains active.
