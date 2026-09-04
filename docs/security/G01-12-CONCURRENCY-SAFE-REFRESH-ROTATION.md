# G01-12 — Concurrency-Safe Refresh Rotation

**Control:** G01-12  
**Status:** DONE — implementation, deterministic PostgreSQL test, CI and artifact evidence verified  
**Owner:** AFX-CORE Session Security

## Objective

Prove that concurrent attempts to redeem the same refresh token cannot mint multiple valid successors and that detected reuse compromises and revokes the refresh family and its associated session.

## Implementation evidence

**Reviewed commit:** `f75eb41e387b2cba51cc7ad30175d7923927c5bb`

`core/AFX-CORE/src/repository.js`

`PostgresAfxCoreRepository.rotateRefreshToken()` performs the complete rotation in one PostgreSQL transaction. It locks the presented refresh-token row with `FOR UPDATE`, then locks the corresponding refresh-family row with `FOR UPDATE`. The transaction validates token state, family state, current digest and expiry before marking the presented token used, inserting exactly one successor, advancing the family version and updating the associated session access credential. Failure rolls back the transaction.

The service layer in `core/AFX-CORE/src/persistent-core.js` treats `refresh_reuse_detected` as a family-compromise signal and revokes the refresh family and associated sessions.

## Deterministic test evidence

`core/AFX-CORE/test/g01-12-refresh-concurrency.test.js`

The dedicated integration test uses PostgreSQL 16 and issues eight simultaneous `core.refresh()` calls against one refresh token. The CI run passed the test and therefore proved:

1. exactly one call fulfills;
2. seven competing calls reject with the expected refresh-token failure;
3. exactly one consumed token and one successor exist in the family;
4. the family version advances exactly once;
5. reuse detection revokes the complete refresh family;
6. the associated session is revoked;
7. the winning successor cannot be refreshed after family revocation; and
8. the access token minted by the winner is no longer accepted after family revocation.

## CI evidence

Workflow: `AFX-CORE Security`  
Job: `security-tests`  
Run: `33918659248`  
Head SHA: `f75eb41e387b2cba51cc7ad30175d7923927c5bb`  
Conclusion: `success`

The dedicated step `Run G01-12 dedicated concurrency security tests` completed successfully. The same run also passed the bootstrap security suite and the existing PostgreSQL persistence/refresh-race suite.

## Artifact evidence

Artifact: `afx-core-security-evidence-33918659248`  
Artifact ID: `9954146881`  
Digest: `sha256:c8cefb72e152efeaffe1ec43b77807cc7a63dbd56212cc63f176e2c60d047445`  
Expired: `false`

The artifact contains the dedicated G01-12 test output plus PostgreSQL health, version, schema and run metadata.

## Closure decision

G01-12 is formally closed at the control level. This does **not** make Gate G01 GREEN and does not authorize merging PR #18. Remaining controls and the required final security architecture review are still open.
