# AFX-CORE Gate 01 — Final Release Gate

**Gate ID:** G01
**Scope:** Authentication + Identity + Authorization Security Foundation
**Canonical workflow:** `.github/workflows/afx-core-gate-01.yml`
**Canonical matrix:** `docs/security/AFX-CORE-GATE-01-CLOSURE-MATRIX.md`
**Decision states:** `GREEN / CLOSED`, `RED / OPEN`

## Final rule

Gate 01 is closed only when all 26 controls are explicitly `DONE`, all required tests execute successfully in CI, all required evidence is reviewable, all blockers are resolved, the final security architecture review is recorded, and the protected-branch security checks are green.

A control marked `BLOCKED`, `IN PROGRESS`, `UNKNOWN`, or missing required evidence forces `RED / OPEN`.

No workflow, agent, reviewer, or AI component may self-authorize a GREEN decision by changing prose alone. GREEN is valid only when the workflow proves the closure conditions.

## Evidence chain

`Implementation → Deterministic Test → GitHub Actions Job → Machine-readable Evidence → Gate Decision`

Each applicable control requires:

1. exact implementation path and reviewed commit;
2. deterministic automated test;
3. named CI job executing the test/control;
4. machine-readable artifact or equivalent reviewable evidence.

Production-specific controls additionally require their external/environmental proof.

## Mandatory controls

G01-01 through G01-09 are the initial AFX-CORE security baseline.

G01-10 through G01-19 cover durable state, API boundary, refresh concurrency, password calibration, MFA, WebAuthn, recovery, abuse controls, CSRF/cookies, and transport security.

G01-20 requires a real approved KMS/HSM environment, rotation proof, migration handling, startup validation, and audit evidence.

G01-21 requires real workload identity validation and service-to-service authorization.

G01-22 requires durable append-only security audit, tamper resistance, retention, authorization, and query/export evidence.

G01-23 requires the required secret, dependency, SAST, DAST, container, IaC, and SARIF-oriented security scanning path.

G01-24 requires a machine-readable threat/control/test/evidence map and independent security review.

G01-25 requires an independent external penetration test with no unresolved critical/high findings.

G01-26 is the release-gate control itself and must fail closed on any unresolved prerequisite.

## Deliberate blockers

`G01-20` and `G01-25` may not be converted to GREEN through mocks, placeholders, local-only contracts, or documentation-only assertions. Until their real prerequisites exist, Gate 01 remains `RED / OPEN` and Domain Freeze remains active.

## Operational decision contract

The canonical workflow must:

- validate that exactly 26 G01 rows exist;
- reject `IN PROGRESS`, `BLOCKED`, or missing states;
- execute the AFX-CORE security suite with locked dependencies and PostgreSQL where required;
- produce machine-readable gate evidence containing the exact commit SHA and GitHub run ID;
- publish a final `gate-decision.json` artifact;
- fail the workflow unless the matrix explicitly declares `GREEN / CLOSED` and all prerequisite jobs succeed.

## Domain Freeze

Until the canonical workflow reports `GREEN / CLOSED` on the protected branch:

- no new business domain implementation is approved;
- no domain may create an independent identity/session/token authority;
- no domain may bypass AFX-CORE authorization;
- no production release may rely on the Gate being merely documented.

## Current status

**Gate policy: FINALIZED.**

**Current operational decision: RED / OPEN.**

This is intentional: finalizing the Gate means the decision mechanism and acceptance contract are final; it does not mean unresolved security controls are falsely declared complete.

## Closure record

When the final prerequisites are genuinely satisfied, the closure commit must update the canonical matrix from `RED / OPEN` to `GREEN / CLOSED`, record the final security architecture review, and point to the successful protected-branch CI evidence bundle. No other document may override that record.
