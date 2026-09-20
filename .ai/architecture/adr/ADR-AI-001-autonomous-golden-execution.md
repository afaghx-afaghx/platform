# ADR-AI-001 — Production-Grade Autonomous Engineering Agent Golden Execution

- Status: Accepted
- Date: 2026-09-20
- Owner: AFAGHX Engineering Governance
- Scope: AFX-AI-CEA-001

## Decision

AFAGHX autonomous engineering execution follows:

MISSION → BASELINE → REAL MODEL RUNTIME → ISOLATED BRANCH → IMPLEMENT → TEST → EVIDENCE → GATE → PR.

A real model invocation is mandatory for autonomous implementation. Deterministic checks may verify or reject the work, but they cannot substitute for the model.

## Guardrails

1. main is never written by the agent.
2. Autonomous work executes only in an isolated branch.
3. The model receives only the tools required for repository inspection, editing, and allowlisted verification.
4. git push, merge operations, gh, destructive shell operations, and privilege escalation are denied to the model.
5. The workflow, not the model, performs branch push and pull-request creation.
6. Each autonomous task must produce a substantive repository change required by the task definition.
7. The deterministic task loop honors an explicit task override; otherwise it selects the first READY task.
8. Machine-checkable evidence is uploaded as workflow artifacts.
9. UNKNOWN and PARTIAL evidence can never become GREEN.
10. Human review and merge remain mandatory.

## Golden Execution

AFX-GOLDEN-001 is the controlled proof task. It must add the required runtime contract regression test, run it together with the canonical Core runtime test, pass the security gate, move the task to DONE through the deterministic loop, commit the result on the isolated branch, and open a governed PR.

## Consequence

A successful Golden Execution proves the end-to-end automation path from real model execution through implementation, deterministic verification, evidence, and PR creation. Any failure in provider entitlement or policy, task implementation, verification, evidence, or PR creation is a NO-GO and remains visible as such.
