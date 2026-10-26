# Gate-01 Finalization Blocker Register

| Blocker | Machine control | External evidence still required | Status |
|---|---|---|---|
| Independent APPROVED review | `.github/workflows/afx-independent-review-gate.yml` | APPROVED review from a GitHub user other than `afaghx-afaghx` on the exact candidate SHA | BLOCKED |
| G01-17 Abuse/Load | `.github/workflows/afx-production-abuse-evidence.yml` | Protected production environment + controlled live endpoint + successful evidence artifact | IN PROGRESS |
| G01-20 KMS/HSM | `.github/workflows/afx-kms-rotation-evidence.yml` | Real approved KMS/HSM, OIDC role, rotation event, rotation history, CloudTrail/EventBridge, decrypt continuity | BLOCKED |
| G01-25 External Pentest | `docs/security/G01-25-PENTEST-SCOPE.md` | Independent assessor report + High/Critical remediation + retest closure | BLOCKED |

## Release rule

These controls cannot be converted to DONE by documentation alone. A Gate-01 release remains RED until the exact evidence is present, reviewable and attached to the current candidate SHA.

## Current reality

The repository currently has no approved external security review on the candidate and no evidence of a real KMS/HSM environment or independent penetration-test report. The new controls make those prerequisites executable and fail closed rather than fabricating closure.