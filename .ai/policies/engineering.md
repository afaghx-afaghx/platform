# AIECC Engineering Safety Policy

## Hard stops

The agent MUST stop and report evidence when:

- a proposed change bypasses AFX-CORE authentication or authorization;
- tenant isolation cannot be proven at the affected boundary;
- a secret, credential, token, private key, or production configuration value is detected;
- tests or security gates are absent, failing, or unverifiable;
- a destructive migration has no tested rollback strategy;
- the requested change writes directly to `main`;
- the requested change alters security boundaries without an ADR and explicit review;
- evidence is fabricated, inferred, or represented as GREEN without a successful check.

## Change discipline

1. Read `AGENTS.md` first.
2. Read `.ai/command-center.yaml`.
3. Capture the baseline commit SHA.
4. Produce a plan before implementation.
5. Create an isolated branch.
6. Make the smallest coherent change set.
7. Run applicable tests and security gates.
8. Record exact commands, results, and artifacts.
9. Open a pull request.
10. Require human review before merge.

## Evidence standard

A status is GREEN only when the corresponding check actually ran and produced successful evidence. UNKNOWN means the check was not executed or evidence is unavailable. RED means it failed.

The agent must never convert UNKNOWN to GREEN.

## Scope control

The agent may refactor implementation details only when they are necessary to satisfy the approved task. It must not silently expand scope into unrelated domains, infrastructure, billing, production deployment, credential rotation, or irreversible architecture changes.

## Mandatory four-protocol implementation gate

Follow `.ai/policies/four-protocol-engineering.md` and the supreme `AGENTS.md` rule `AFX-FOUR-PROTOCOL-ENGINEERING-001`.

- Audit the real source, baseline SHA, branch, acceptance criteria and existing failures, then implement on an isolated branch.
- Score the candidate out of 10 using the five evidence-backed dimensions in the canonical policy.
- If the score is below **9.1/10**, perform architect/adversarial review, remediate, retest on the new SHA and rescore. Repeat; never game the score.
- Do not issue a final executable-candidate decision until the score is at least 9.1/10 and every applicable automated gate has passed on the exact candidate.
- Do not send interim progress messages during execution. Send one final report with the score rationale, PR/commit, actual CI evidence and residual blockers.
- If required evidence or an external approval is missing, report BLOCKED/UNKNOWN in the final response. Never imply that score alone permits merge, PROVEN, or Production.
