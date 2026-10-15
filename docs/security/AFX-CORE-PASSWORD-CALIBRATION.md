# AFX-CORE Password Hashing Calibration

## Decision

AFX-CORE retains Node built-in `scrypt` as the current password-hashing baseline.

Selected parameters:

- `N = 2^15`
- `r = 8`
- `p = 3`
- `keyLength = 32`
- random 16-byte salt per password

OWASP lists this scrypt configuration as an equivalent minimum-strength option and recommends calibration against the target environment, generally keeping password-hash computation below one second.

Reference: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

## Calibration evidence

Local baseline on 2026-10-07, Node v22.16.0, 8 samples:

- timings: 241.27, 255.88, 256.09, 257.27, 265.19, 265.36, 294.95, 297.60 ms
- average: 266.70 ms
- p95: 297.60 ms
- target: `< 1000 ms/hash`

This is an engineering baseline, not a claim about production hardware. CI repeats the measurement. Production deployment must retain these parameters or provide fresh calibration evidence before changing them.

## Upgrade rule

Any future password-hashing parameter change requires fresh benchmark evidence, security review, CI proof, and an explicit migration/rehash strategy.