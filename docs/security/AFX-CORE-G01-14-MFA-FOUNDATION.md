# AFX-CORE G01-14 — MFA Foundation

## Decision

AFX-CORE MFA foundation uses standards-based TOTP as the interoperable software-token factor. TOTP uses a 30-second time step, 6-digit codes, and a one-step verification window. Passkeys/WebAuthn remain a separate G01-15 control.

## Security requirements

- MFA secrets are generated with the platform CSPRNG.
- Persisted TOTP secrets are encrypted with AES-256-GCM; production key custody and rotation are reserved for G01-20 KMS/HSM.
- Password authentication does not issue access/refresh tokens when an active MFA factor exists; it creates a short-lived persisted MFA challenge instead.
- MFA challenges persist tenant context, expiry, attempts and consumed state.
- TOTP verification is bounded to the configured time window and accepted time-steps are atomically persisted to prevent replay.
- Recovery codes are 128-bit random one-time credentials and are stored only as SHA-256 digests.
- Failed MFA attempts are bounded to five attempts per challenge and challenges expire after five minutes.
- Enrollment confirmation, successful/failed verification, recovery-code use, and factor revocation are audited without OTPs, raw recovery codes, or token credentials.
- Factor revocation disables future MFA verification.
- Changing or removing an existing MFA factor requires a higher-assurance authenticated control path in the surrounding identity/recovery controls; this remains part of G01-16/G01-20 hardening.

## Persistent model

The PostgreSQL schema contains `afx_mfa_factors`, `afx_mfa_recovery_codes`, and `afx_mfa_challenges`. This state survives `PersistentAfxCore` service recreation and participates in the authentication flow.

## CI acceptance

The dedicated GitHub Actions job `identity-security` runs primitive MFA tests plus PostgreSQL-backed authentication, recovery, replay, expiration, attempt-limit, and revocation tests and publishes a reviewable evidence artifact.

G01-14 remains IN PROGRESS until that CI job passes on the Mission branch and the evidence is reviewed.

## Scope boundaries

- G01-15 owns browser WebAuthn/Passkeys.
- G01-16 owns account recovery and high-assurance factor replacement/reset.
- G01-20 owns production KMS/HSM key management and rotation.
