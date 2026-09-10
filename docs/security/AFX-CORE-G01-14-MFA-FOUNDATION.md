# AFX-CORE G01-14 — MFA Foundation

## Decision

AFX-CORE MFA foundation uses standards-based TOTP as the interoperable software-token factor. TOTP uses a 30-second time step, 6-digit codes, and a one-step verification window. Passkeys/WebAuthn remain a separate G01-15 control.

## Security requirements

- MFA secrets are generated with the platform CSPRNG.
- OTP values are never logged or placed in audit payloads.
- TOTP verification is bounded to the configured time window.
- Verification must be rate-limited and must support lockout/risk controls before production enablement.
- A TOTP code must not be accepted more than once for the same factor/time-step.
- Recovery codes are one-time credentials and must be stored only as protected digests by the persistence layer.
- Enrollment, factor replacement, successful/failed verification, recovery-code use, and factor revocation are security-sensitive audited actions.
- Changing or removing an existing MFA factor requires re-authentication with an existing factor or an equivalent high-assurance recovery path.
- Secret encryption/key management is intentionally coupled to the G01-20 KMS/HSM boundary before production rollout.

## Current implementation status

This commit establishes the cryptographic and interoperability primitives and deterministic tests. Full persistent MFA enrollment, replay prevention, recovery-code consumption, revocation, and abuse controls remain required before G01-14 can move to DONE.

## References

- RFC 6238 defines TOTP and recommends a limited validation delay/window; a larger acceptance window increases attack exposure.
- OWASP MFA guidance requires short-lived, single-use OTP handling, strict attempt limits, secure MFA reset, and stronger controls for changing enrolled factors.
