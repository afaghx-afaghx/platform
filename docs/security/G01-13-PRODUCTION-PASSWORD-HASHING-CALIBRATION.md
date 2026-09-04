# G01-13 — Production Password Hashing Calibration

**Control:** G01-13  
**Status:** IN PROGRESS — CI calibration baseline implemented; production hardware confirmation and security review remain required.  
**Owner:** AFX-CORE Security

## Objective

Select and document a password hashing configuration using measured latency, memory pressure and concurrency impact rather than an unvalidated algorithm claim.

## Current implementation

`core/AFX-CORE/src/security.js` currently uses Node.js `scryptSync` with:

- N = 32768 (2^15)
- r = 8
- p = 3
- derived key length = 32 bytes
- salt = 16 random bytes
- maxmem = 64 MiB

The encoded password record stores the algorithm and parameters with the salt and derived key, allowing verification to use the parameters associated with the stored credential.

## Calibration evidence

`core/AFX-CORE/test/g01-13-password-hashing-calibration.test.js` measures repeated password-hash latency, p50/p95 timing, theoretical scrypt working-memory requirement, successful verification, and concurrent hashing behavior. The test emits a machine-readable JSON evidence record containing Node/platform/CPU/memory metadata, samples, latency percentiles, concurrency and thresholds.

The CI workflow runs the calibration using Node.js 22 on `ubuntu-latest` and includes the calibration output in the security evidence artifact.

## Security decision rule

The current configuration is **not** declared production-calibrated solely from CI timing. CI establishes a reproducible baseline and catches regressions. Final production parameters must be confirmed on the actual or materially equivalent production CPU/memory class under the expected authentication concurrency budget.

The current baseline is retained pending that production-like confirmation. Migration to Argon2id is not performed speculatively: if the measured production constraints require a different memory-hard profile, the migration must include a versioned credential format, compatibility verification, rehash-on-success strategy, and explicit rollout/rollback plan.

## Closure criteria

G01-13 may become `DONE` only when:

1. the benchmark passes in CI;
2. the exact commit SHA and CI artifact are reviewable;
3. production-like hardware measurements are recorded;
4. latency and memory/concurrency budgets are explicitly approved;
5. the selected algorithm and parameters are documented as the production baseline; and
6. security architecture review is recorded.

A green CI timing test alone is insufficient to claim production calibration.
