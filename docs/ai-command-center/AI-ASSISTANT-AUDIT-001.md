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

The task initially required direct execution of `.ai/runtime/local-provider.contract.test.mjs`, an AI-authored file that the agent itself is allowed to create or edit. Allowlisting that exact test command would make arbitrary code inside the candidate test executable on the persistent self-hosted runner.

**Remediation:** the task now runs `node --check` for syntax only, then invokes the trusted `scripts/ai/validate-local-provider-contract.mjs` validator. That validator reads candidate source as text, restricts imports/primitives, and verifies provider/config assertions without importing or executing the candidate file. The deterministic loop uses exact argument arrays and does not invoke a shell.

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


### AFXAI-09 — Production-marked configuration paths were readable (High)

The OpenCode engineer agent defaulted to broad repository reads but denied only common secret suffixes and paths such as `.env`, `.pem`, and `secrets/*`. A production-marked configuration file such as `deployment/production.yaml` or `config/app.Production.json` did not match those denials and could be supplied to the local model.

**Remediation:** add explicit deny rules for production/prod/live/deploy-config path patterns to both the global OpenCode configuration and the selected engineer agent. The exact pattern contract is now checked by the independent Golden Execution test. This remains a path-based defense-in-depth control, not a replacement for filesystem isolation or content-based secret scanning.


### AFXAI-10 — Git-history display permissions bypassed file-read denials (High)

The engineer agent allowed broad `git show *` and `git log *` shell patterns. Those commands can print historical file contents and patches, so a path-based `read` deny for a production configuration was not an effective boundary while those shell grants remained.

**Remediation:** remove the broad allow rules and explicitly deny both history-reading command patterns at global and agent scope. Regression checks now evaluate the final-match read policy against representative production-marked paths and confirm normal repository configuration remains readable.


### AFXAI-11 — Agent-authored test code ran inside the persistent self-hosted execution job (Critical)

The local agent was permitted to edit `.ai/runtime/local-provider.contract.test.mjs` and the workflow invoked that exact file with `node --test`. Shell-command allowlisting is not a JavaScript sandbox: code in the editable test could access the runner process, filesystem, and network before the candidate was scanned or published.

**Remediation:** remove direct execution of this editable test from both OpenCode allowlists and the local workflow. Run syntax-only validation with `node --check`, then execute the protected static validator `scripts/ai/validate-local-provider-contract.mjs`. The validator reads the candidate as text; it does not import, evaluate, or execute that file. Only trusted, repository-baseline test suites are executed before candidate publication. Human review remains required.

### AFXAI-12 — Candidate secret scanning covered too few credential families (High)

The earlier final scan recognized private-key markers, a narrow GitHub token shape, and strings beginning with `sk-`. It did not comprehensively detect AWS access keys, bearer tokens, credential-bearing database URLs, or long credential assignments.

**Remediation:** both local and optional cloud workflows now invoke `scripts/ai/scan-candidate-secrets.py` after untracked files are included and before the agent commits, pushes, or opens a candidate PR. The scanner examines added diff lines and reports only the path and rule name, never the matched value. This is a pattern-based defense, not a guarantee against obfuscated or encoded secrets.

## Verification plan

The candidate includes expanded `.ai/runtime/golden-execution.contract.test.mjs` regression checks for:
- task queue/allowlist consistency and immutable queue behavior;
- truthful task and final-gate states;
- OpenCode v2 permission format and deny-by-default shell policy;
- untracked-file inclusion, exact task path allowlists, static validation of agent-authored test source, broad candidate secret scanning before publication;
- local/cloud mode and task-default consistency.

Pull-request CI must pass on the exact final candidate SHA. The control-plane test verifies permission ordering, deny rules, task/allowlist consistency, the non-execution boundary, and scanner presence. A real local Ollama run on the self-hosted runner still remains unproven until it is executed and its evidence captured.

## Explicitly unproven / external dependencies

- A real local Ollama model run on the `afaghx-ai` self-hosted runner has not been executed as part of this source audit.
- Availability of the self-hosted runner, installed model, and approved `afaghx-ai-execute` GitHub Environment remains an operational precondition.
- No independent human review or merge has occurred.
- No live API, production deployment, production readiness, or `PROVEN` status is claimed.
- This remediation does not close the separate AFAGHX Gate-01, KMS/HSM, or penetration-test requirements.

## Release decision

**Status: NOT READY FOR MERGE until candidate CI and independent review complete.** Even after merge, the AI assistant's local execution path requires a real runner/model smoke test and evidence capture before its operational readiness can be claimed.


## Follow-up architect review — 2026-10-14

The first secret-scanner regression run exposed a real false-positive defect after the original remediation. The candidate was kept blocked; the test was not weakened or skipped.

### AFXAI-13 — Credential assignment rule produced source-code false positives (High)

The credential-name alternation was not grouped with the value-assignment constraint, which allowed source declarations and documentation names to be misclassified as assigned secrets. After a first repair, PR scanning also found a credential-shaped URL literal in the regression fixture.

**Remediation:** the entire name alternation is grouped; a candidate must match an assignment form and a sufficiently long secret-like value. The regression suite now covers positive credential patterns, environment-variable placeholders, documentation/name-only references, and self-scans the scanner source. The database URL fixture is constructed by concatenation so scanner tests do not place a credential URL literal into the PR diff. Pattern scanning remains a defense-in-depth measure, not proof that every possible secret is detected.

### AFXAI-14 — Self-hosted local runtime accepted an unpinned OpenCode CLI (Medium)

The workflow only installed OpenCode if no executable was present, using an unversioned package, and the preflight merely printed the version. A pre-existing incompatible installation could therefore be accepted on the persistent self-hosted runner.

**Remediation:** the local workflow pins `@opencode/cli` to `2.0.28`, installs that version if the existing binary does not report it, and fails closed if the resulting executable's reported version still does not match. The local preflight validates the same version. The contract test asserts the pin and fail-closed check; CI shell-parses the preflight and local runner scripts.

## Exact-candidate verification snapshot

- Code and runtime-guard candidate SHA before this report-only update: `23363888885fb5a1f788f808e5f5f0253424f29f`.
- AI Architecture Gate: [run 38577789687](https://github.com/afaghx-afaghx/platform/actions/runs/38577789687) — success.
- AFX-CORE Security: [run 38577789623](https://github.com/afaghx-afaghx/platform/actions/runs/38577789623) — success.
- AFAGHX AI Evidence Gate: [run 38577789670](https://github.com/afaghx-afaghx/platform/actions/runs/38577789670) — success.
- AFX-CORE Gate 01 scoped PR checks: [run 38577789716](https://github.com/afaghx-afaghx/platform/actions/runs/38577789716) — success. This is not a statement that the global Gate-01 is closed.
- These CI results validate the candidate code and tests at the stated SHA; the report-only follow-up commit must still receive its own required CI run before that newer SHA can be treated as the final candidate.

## Four-protocol score and final disposition

The scope-limited engineering assessment of the candidate code at `23363888885fb5a1f788f808e5f5f0253424f29f` is **9.2/10**:
- Requirements and functional correctness: 1.9/2 — local provider/task contract and evidence-state regressions are covered.
- Architecture and security: 1.9/2 — fail-closed task reporting, protected candidate-test static validation, restricted shell commands, path denials and secret scanning have explicit checks.
- Robustness and maintainability: 1.8/2 — scanner false positives and CLI reproducibility were repaired; remaining pattern-based detection limits are documented.
- Tests and regression resistance: 1.9/2 — the regression suite and four applicable CI workflows pass on the stated code SHA.
- Evidence and release discipline: 1.7/2 — source/CI evidence is SHA-bound, but no independent human review or real self-hosted Ollama execution exists yet.

**Decision: scoped code candidate passes the automated review threshold; assistant operational readiness and merge remain BLOCKED.** No independent human review is recorded, the real local model/agent run on `afaghx-ai` is not demonstrated, and the separate repository Final Gate remains required. PR #266 remains an open, unmerged candidate; Main is unchanged. No `PROVEN`, production-ready, or release status is asserted.
