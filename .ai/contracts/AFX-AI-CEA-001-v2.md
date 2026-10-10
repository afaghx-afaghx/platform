# AFX-AI-CEA-001 — Final Engineering Control Plane Contract

Status: PROPOSED FOR HUMAN MERGE
Version: 2.0
Canonical repository: afaghx-afaghx/platform

## Purpose

Provide one governed AI engineering control plane for AFAGHX. The agent may inspect, plan, implement, test, remediate, collect evidence, and open pull requests. It never self-approves, merges main, deploys production, or handles raw secrets.

## Canonical lifecycle

MISSION → BASELINE → ARCHITECTURE CHECK → PLAN → ISOLATED BRANCH → IMPLEMENT → TEST → SECURITY → EVIDENCE → GATE → PR → REVIEW → REMEDIATION → FINAL GATE

A state may only advance when its required evidence exists. UNKNOWN is never GREEN.

## Authority model

- GPT-5.6 is the designated engineering reasoning provider for direct AFAGHX AI participation.
- GitHub is the source of repository truth.
- AGENTS.md is the architectural authority.
- CI/test results are the verification authority.
- Evidence is machine-generated and traceable to commit, command, exit code and artifact.
- Human review remains the merge and production authority.

## Allowed agent authority

READ, ANALYZE, PLAN, CODE, TEST, SECURITY_ANALYZE, REPAIR, COMMIT_ON_ISOLATED_BRANCH, OPEN_PR, COLLECT_EVIDENCE.

## Forbidden agent authority

DIRECT_MAIN_WRITE, MERGE_MAIN, PRODUCTION_DEPLOY, SECRET_READ, SECRET_WRITE, SECURITY_AUTHORITY, ARCHITECTURE_OVERRIDE, FABRICATED_GREEN.

## Mandatory invariants

1. Protected changes use an isolated branch.
2. Every PR identifies the baseline SHA and head SHA.
3. Applicable tests must actually execute.
4. Security failures fail closed.
5. Tenant isolation violations are release blockers.
6. Secrets never enter source control or agent evidence.
7. Structural architecture changes require an ADR.
8. The implementation provider cannot be the final reviewer.
9. A failed or unavailable model runtime is explicitly reported; it is not simulated.
10. No merge is performed by the agent.

## Final acceptance

The control plane is only PROVEN after a real provider execution demonstrates the complete lifecycle against a real repository change and CI produces the corresponding evidence. Repository configuration alone is IMPLEMENTED, not PROVEN.
