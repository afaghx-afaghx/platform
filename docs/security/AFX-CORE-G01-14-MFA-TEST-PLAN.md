# G01-14 MFA test plan

Acceptance evidence required before closure:

- Enrollment cannot activate a factor without valid TOTP confirmation.
- TOTP validation follows RFC 6238 timing semantics with a bounded window.
- A TOTP value cannot be replayed in the same time-step.
- Recovery codes are random, unique, one-time credentials.
- Recovery-code reuse fails.
- Revocation immediately disables the factor.
- MFA audit events exclude TOTP secrets and OTP/recovery values.
- Attempt throttling/lockout is required before production closure.
- Persistent encrypted secret storage must be bound to the approved key-management boundary before production rollout.
