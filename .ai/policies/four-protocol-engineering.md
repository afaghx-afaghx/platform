# AFX-FOUR-PROTOCOL-ENGINEERING-001
Version: 1.0
Status: Mandatory engineering policy

This protocol is mandatory for every AFAGHX code-writing task handled by an AI agent. It supplements, and never overrides, `AGENTS.md`, security controls, review requirements, or the human approval boundary.

## Protocol 1 — Forensics, then implementation

1. Read `AGENTS.md`, `.ai/command-center.yaml`, this policy, and the affected architecture/contract files before editing.
2. Capture the canonical Main SHA, current branch/PR state, working-tree or changed-file baseline, relevant failures, and explicit acceptance criteria.
3. Inspect the actual source and test path. Do not infer unseen implementation from a title, old report, or previous score.
4. Once the scope and acceptance criteria are clear, begin the smallest complete implementation in an isolated feature/remediation branch. Do not stop after writing a plan or giving advice.
5. Never write directly to `main`, bypass required security boundaries, weaken a failing gate merely to make it green, or mark work complete without evidence.

## Protocol 2 — Evidence-based score out of 10

After implementation, score the exact candidate on five dimensions, each from 0 to 2:

| Dimension | Maximum | What must be inspected |
|---|---:|---|
| Requirements and functional correctness | 2 | Acceptance criteria, actual behavior, negative/edge cases |
| Architecture and security | 2 | Constitution, dependency direction, authorization, tenant isolation, secret and failure boundaries |
| Robustness and maintainability | 2 | Errors, concurrency, idempotency, rollback, operability, scope control |
| Tests and regression resistance | 2 | Relevant tests, negative tests, reproducibility, successful execution |
| Evidence and release discipline | 2 | Exact commit, CI runs/artifacts, truthful statuses, review and rollback obligations |

The score must include a short rationale and a file/test/evidence reference for every dimension. A score is an engineering assessment, not a substitute for CI, security review, or human approval.

**Minimum release-candidate score: 9.1/10.** A score of 9.0 does not pass the threshold. Any failed required test/gate, unresolved critical/high security finding, missing required evidence, architecture violation, or unknown mandatory check caps the candidate below the release threshold and blocks final issuance. Never inflate a score to meet the target.

## Protocol 3 — Architect review, remediation, and re-test

1. Re-review the actual diff as the AFAGHX architect and adversarial reviewer: search for hidden regressions, fail-open behavior, tenant/security bypass, concurrency races, unsafe paths, missing tests, and evidence gaps.
2. If the score is below 9.1/10, record the concrete findings, fix the code/tests/docs, and rerun the applicable checks against the new candidate SHA.
3. Re-score the revised candidate. Repeat the architecture-review → remediation → test → score loop until it reaches at least 9.1/10 and all applicable automated gates pass.
4. Never use an earlier SHA's successful run as proof for a later candidate. Evidence must match the exact commit it claims to validate.
5. If progress is blocked by an external prerequisite, unavailable environment, required credential, independent reviewer, or security assessor, stop the release decision at BLOCKED/UNKNOWN and report the precise blocker in the final report. Do not invent another score, evidence, approval, or production state to bypass it.
6. Implementers must not self-approve security-sensitive work. Required independent security review and human approval remain mandatory.

## Protocol 4 — Final-only communication and truthful issuance

- Do not send interim status/progress messages while executing an accepted task. Communicate once, after the current task reaches a final evidence-backed decision.
- A **final executable candidate** may be issued only when the scoped implementation exists on a recorded branch/commit, required tests and CI have succeeded on that exact candidate, architecture review is complete, and the final score is at least 9.1/10.
- If those conditions are not met, the final response must say BLOCKED/NOT FINAL and identify the missing evidence or external dependency; it must not label the candidate executable, PROVEN, production-ready, or released.
- A candidate on a pull-request branch is not a Main release. Production/PROVEN requires the repository's separate Final Gate, live/runtime evidence, all applicable security controls, and required human approval.
- The final report must contain: decision; score and five-dimension rationale; branch, PR and candidate SHA; exact changed scope; executed checks with real result links; remaining blockers; and a clear separation between candidate readiness and production release.

## Required state machine

`AUDIT → IMPLEMENT → SCORE → ARCHITECT/ADVERSARIAL REVIEW → REMEDIATE IF <9.1 → RETEST → RESCORE → EVIDENCE AUDIT → FINAL GATE → FINAL-ONLY RESPONSE`

No step may be skipped. A passing score never overrides a failed/unknown mandatory gate.
