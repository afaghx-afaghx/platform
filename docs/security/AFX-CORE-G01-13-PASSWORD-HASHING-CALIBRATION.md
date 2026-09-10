# AFX-CORE G01-13 — Production Password Hashing Calibration

**Decision:** retain scrypt for the current AFX-CORE password-storage implementation and freeze a reviewed production profile.

## Selected profile

| Parameter | Value |
|---|---:|
| Algorithm | scrypt |
| N | 32,768 (`2^15`) |
| r | 8 |
| p | 3 |
| Derived key length | 32 bytes |
| Salt length | 16 bytes |
| Maximum target per hash | < 1,000 ms |

This profile is one of OWASP's published scrypt configurations and is the lowest-memory/CPU profile in that published set that uses `N=2^15, r=8, p=3`. The production choice remains subject to measured server performance rather than a purely theoretical parameter choice.

## Implementation controls

`core/AFX-CORE/src/security.js` exposes `PASSWORD_HASHING_PROFILE` so the selected parameters are explicit and testable. Password creation always uses the frozen profile, and verification rejects hashes whose algorithm or work-factor parameters do not match the active profile. Salt and derived-key lengths are also validated before the KDF is invoked.

The implementation continues to use a 16-byte random salt and constant-time comparison for the derived key. Node.js documents 16-byte random salts as a recommended baseline for `scrypt`/`scryptSync`.

## Calibration method

The test `core/AFX-CORE/test/password-hashing-calibration.test.js` performs five real password-hash operations on the CI runner, verifies each result, records individual timings, calculates the median and maximum, and fails when the measured maximum reaches or exceeds one second.

The CI workflow `AFX-CORE Security` executes this calibration under the existing `security-tests` job and uploads the test output together with the rest of the AFX-CORE evidence artifact.

## Review conclusion

G01-13 is not closed by the existence of an OWASP-compatible parameter set alone. Closure requires the GitHub Actions benchmark to pass on the Mission branch and the resulting artifact to be reviewable. The profile is deliberately explicit so future hardware improvements can trigger a controlled work-factor increase rather than an undocumented change.

## References

- OWASP Password Storage Cheat Sheet — scrypt guidance and work-factor selection.
- Node.js `crypto.scryptSync()` documentation — `N`, `r`, `p`, `maxmem`, and salt guidance.
