# Gate 01 Crypto Calibration Evidence

## Control

G01-13 — Production password hashing calibration

## Selected implementation

AFX-CORE uses scrypt with:

- N = 32768
- r = 8
- p = 3
- key length = 32 bytes
- maximum memory = 64 MiB

The parameters are explicit in `core/AFX-CORE/src/security.js` and are exercised by the security calibration test.

## Evidence

Calibration test:
`core/AFX-CORE/test/security-calibration.test.js`

CI:
`Gate 01 Crypto Calibration`

Fresh successful run:
`36348204902`

The CI benchmark executed five password-hashing samples and enforced a hard upper bound of 5 seconds per hash. The measured samples are retained in the uploaded run artifact.

## Decision

The repository keeps the existing scrypt implementation rather than introducing a new password-hashing dependency during Gate-01 closure. The parameters are explicit, reproducible and benchmarked in CI.

This closes the implementation/calibration portion of G01-13; any future parameter change must repeat the benchmark and review.
