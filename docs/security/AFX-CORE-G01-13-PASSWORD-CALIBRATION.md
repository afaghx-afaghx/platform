# AFX-CORE G01-13 Password Hashing Calibration

**Control:** G01-13 — Production password hashing calibration
**Decision:** Calibrated scrypt remains the production password-verifier baseline for the current Node 22 runtime.
**Algorithm:** scrypt
**Parameters:** N=32768, r=8, p=3, keyLength=32
**Benchmark:** 7 samples on GitHub Actions, Node v22.23.2
**Observed median:** 212.18 ms
**Observed p95:** 217.76 ms

## Evidence

GitHub Actions security run `34154375749` executed `npm run benchmark:password` successfully and produced the machine-readable benchmark artifact. The same run passed the AFX-CORE security and PostgreSQL persistence suites.

## Security rationale

The implementation uses a memory-hard password hashing function with per-password random salt and a structured verifier format. The selected parameters are explicitly versioned in the implementation and are measured in CI rather than assumed from local development performance.

The benchmark is an operational calibration signal, not a proof of universal production performance. Production deployment must re-calibrate against the actual compute class and concurrency profile before materially changing the authentication capacity envelope.

## Review boundary

This document records the engineering calibration decision and its CI evidence. Final Gate 01 closure still requires the independent security architecture review defined by the Gate 01 closure rule.
