# AFAGHX AI Assistant Audit — AFX-AI-AUDIT-001

- Date: 2026-10-14
- Audit baseline: `main` at `15f266a1ff3fc1c52c169c8922ea09278142d960`
- Candidate branch: `fix/ai-assistant-gate-evidence-v1`
- Scope: AI Chief Engineering Agent control plane, task runner, provider configuration, OpenCode permissions, GitHub Actions workflows, and task evidence.
- Status: REMEDIATION CANDIDATE — not merged; end-to-end local model execution not yet demonstrated.

## Audit verdict

The repository contained deterministic control-plane inconsistencies that could prevent the local-first engineering task from running, misrepresent test success as `PROVEN`, omit new/untracked content from scope and secret checks, and make the optional cloud workflow fail on its default task ID. The audit fixes below have been implemented on an isolated branch. No direct change was made to `main`.

## Findings and remediation

### AFXAI-01 — Task verification command rejected by its own allowlist (High)

The queue required `node --test .ai/runtime/local-provider.contract.test.mjs`, but the task runner allowlist did not contain that exact argument vector. The deterministic loop would stop with `command_not_allowlisted` before the task's intended verification ran.

**Remediation:** add the exact queued command to the allowlist; validate the entire command list before executing any command; reject malformed command data. The runner uses argument arrays and does not invoke a shell.

### AFXAI-02 — Test execution was promoted to PROVEN (High)

The task runner reported `PROVEN` when its configured commands passed. That did not prove the PR checks, an independent review, merge approval, or production readiness.

**Remediation:** the task loop reports `TESTED` and a separate `GREEN/RED/UNKNOWN` verification state. Workflow final steps report `CANDIDATE_CREATED`, `PR_CI_PENDING`, `HUMAN_REVIEW_REQUIRED`, and `production_ready=false`. The task-loop result is evidence for the named commands only, not a release verdict.

### AFXAI-03 — Canonical task registry could be mutated by a verification run (High)

The old task loop changed `.ai/tasks/queue.json` from `READY` to `DONE` and the autonomous workflow committed all changes. That both widened the task's scope and could leave future dispatches unable to reuse the task.

**Remediation:** the task loop no longer writes the canonical queue. It writes task-specific evidence under `agent-evidence/`. The workflow validates that evidence ID, status, truth state and verification state instead of requiring a queue mutation.

### AFXAI-04 — Untracked files escaped change and secret-diff inspection (High)

The workflows used `git diff` while the model's required new test and generated reports could still be untracked. A plain diff does not include untracked files, so a manifest or scan could omit candidate content.

**Remediation:** `scripts/ai/include-untracked-in-diff.sh` registers nonignored untracked files as intent-to-add before scope, manifest, patch, and secret scanning. Exact task-path allowlists reject unexpected agent-authored files. A final secret scan is placed before commit/push/PR creation, after the evidence bundle is assembled.

### AFXAI-05 — Optional cloud workflow's default task did not exist (High)

The cloud workflow defaulted to `AFX-GOLDEN-001`, while the governed queue contains `AFX-GOLDEN-LOCAL-001`; its prompt also hard-coded a different required output path.

**Remediation:** align the default task with the queue and require the agent to read `required_change_paths` from the selected queue item, then apply the same scope guard as the local path.

### AFXAI-06 — OpenCode v2 configuration mixed v1 agent permission syntax and broad command grants (High)

The repository had a v2-style `opencode.json` configuration while the custom agent used v1 fields (`permission` and `bash`). The global config also granted broad `node *`, `python3 *`, `npm *`, and `git diff *` commands, weakening a command allowlist.

**Remediation:** migrate the agent frontmatter to v2 `permissions` rules; default shell and edits to deny; allow only the task's exact test commands and limited inspection commands; deny access to likely secret paths and deny edits to canonical governance/configuration files.

### AFXAI-07 — UI exposed modes that had no separate execution contract (Medium)

The workflow presented `plan`, `audit`, `implement`, `security`, and `verify` options, but the execution pipeline still required the same substantive golden task and verification commands.

**Remediation:** expose only `golden-execution` until the other modes have distinct task and output contracts.

### AFXAI-08 — Runtime integration test prerequisites could be missing (Medium)

The runtime integration test can be skipped when `DATABASE_URL` is absent. A skipped test is not proof of runtime behavior.

**Remediation:** the task loop now fails closed with UNKNOWN when the database-backed runtime test is required but `DATABASE_URL` is missing. The local workflow supplies the PostgreSQL service URL.

## Verification plan

The candidate includes expanded `.ai/runtime/golden-execution.contract.test.mjs` regression checks for:
- task queue/allowlist consistency and immutable queue behavior;
- truthful task and final-gate states;
- OpenCode v2 permission format and deny-by-default shell policy;
- untracked-file inclusion, exact task path allowlists, final secret scan ordering;
- local/cloud mode and task-default consistency.

Pull-request CI must pass on the exact candidate SHA. That evidence is not yet available at the time this file was authored.

## Explicitly unproven / external dependencies

- A real local Ollama model run on the `afaghx-ai` self-hosted runner has not been executed as part of this source audit.
- Availability of the self-hosted runner, installed model, and approved `afaghx-ai-execute` GitHub Environment remains an operational precondition.
- No independent human review or merge has occurred.
- No live API, production deployment, production readiness, or `PROVEN` status is claimed.
- This remediation does not close the separate AFAGHX Gate-01, KMS/HSM, or penetration-test requirements.

## Release decision

**Status: NOT READY FOR MERGE until candidate CI and independent review complete.** Even after merge, the AI assistant's local execution path requires a real runner/model smoke test and evidence capture before its operational readiness can be claimed.
