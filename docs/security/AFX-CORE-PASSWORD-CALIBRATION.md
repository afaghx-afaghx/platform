# AFX-CORE Password Hashing Calibration

**Control:** G01-13
**Status:** REVIEW_REQUIRED

## Decision

AFX-CORE retains Node built-in `scrypt` as the current password-hashing baseline.

Selected parameters:

- `N = 2^15`
- `r = 8`
- `p = 3`
- `keyLength = 32`
- random 16-byte salt per password
- `maxmem = 64 MiB`

The parameters are explicit and benchmarked against the target runtime. The calibration test enforces a p95 budget below one second per password hash.

Reference: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

## Evidence contract

The CI job must record:

- exact candidate SHA;
- Node runtime version;
- all sample timings;
- average and p95;
- parameters;
- pass/fail result.

This document is evidence metadata, not production-hardware proof.

## Closure rule

G01-13 moves to DONE only after the calibration CI artifact is reviewed by the security architecture reviewer and the selected parameters are accepted for the target production runtime. A future parameter change requires fresh calibration, review, CI evidence and a rehash/migration strategy.
