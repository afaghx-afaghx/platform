# G01-14 Implementation Status

## Implemented in Mission branch

- TOTP secret generation with the platform cryptographic random source.
- RFC 6238-compatible TOTP verification primitives.
- Stateful MFA enrollment confirmation.
- Stateful TOTP replay prevention per user/time-step.
- Single-use recovery-code consumption with SHA-256 digests held in service state.
- Factor revocation.
- Audit events for MFA lifecycle operations without emitting the TOTP secret or submitted code.
- Deterministic tests for enrollment, replay, recovery-code reuse, revocation and audit redaction.

## Not yet production-closed

- Persistent MFA factor/recovery state in PostgreSQL.
- Encrypted-at-rest MFA secret handling integrated with approved KMS/HSM (G01-20 prerequisite).
- Attempt counters and distributed rate limiting/lockout (G01-17 prerequisite).
- Integration into the primary password authentication transaction/session step-up flow.
- Full recovery and factor replacement policy (G01-16).
- Dedicated `identity-security` CI job running the complete MFA suite.

Therefore G01-14 remains IN PROGRESS until the above production acceptance conditions are proven in CI.
