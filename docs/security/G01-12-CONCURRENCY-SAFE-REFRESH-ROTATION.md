# G01-12 — Concurrency-Safe Refresh Rotation

**Control:** G01-12  
**Status:** IN PROGRESS — awaiting CI evidence and formal security review  
**Owner:** AFX-CORE Session Security

## Objective

Prove that concurrent attempts to redeem the same refresh token cannot mint multiple valid successors and that detected reuse compromises and revokes the refresh family and its associated session.

## Implementation evidence

`core/AFX-CORE/src/repository.js`

`PostgresAfxCoreRepository.rotateRefreshToken()` performs the complete rotation in one PostgreSQL transaction. It locks the presented refresh-token row with `FOR UPDATE`, then locks the corresponding refresh-family row with `FOR UPDATE`. The transaction validates token state, family state, current digest and expiry before marking the presented token used, inserting exactly one successor, advancing the family version and updating the associated session access credential. Failure rolls back the transaction.

The service layer in `core/AFX-CORE/src/persistent-core.js` treats `refresh_reuse_detected` as a family-compromise signal and revokes the refresh family and associated sessions.

## Deterministic test evidence

`core/AFX-CORE/test/g01-12-refresh-concurrency.test.js`

The dedicated integration test uses PostgreSQL 16 and issues eight simultaneous `core.refresh()` calls against one refresh token. It proves:

1. exactly one call fulfills;
2. seven competing calls reject with the expected refresh-token failure;
3. exactly one consumed token and one successor exist in the family;
4. the family version advances exactly once;
5. reuse detection revokes the complete refresh family;
6. the associated session is revoked;
7. the winning successor cannot be refreshed after family revocation; and
8. the access token minted by the winner is no longer accepted after family revocation.

## CI evidence

`.github/workflows/afx-core-security.yml`

The `security-tests` GitHub Actions job executes `npm run test:g01-12` against a PostgreSQL 16 service and captures the output in `artifacts-security-g01-12.txt`. The evidence artifact also records the commit SHA, workflow, run ID, PostgreSQL health/version and schema evidence.

## Closure rule

G01-12 becomes `DONE` only after the dedicated test passes in CI and the resulting artifact is reviewable against the exact commit SHA. A green local test without CI/artifact evidence is not sufficient.
