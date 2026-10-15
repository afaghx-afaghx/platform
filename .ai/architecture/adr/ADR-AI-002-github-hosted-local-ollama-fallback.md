# ADR-AI-002 — Ephemeral GitHub-Hosted Linux Runner for Local Ollama

- Status: Accepted
- Date: 2026-10-15
- Scope: AFX-AI-CEA-001 execution infrastructure
- Supersedes: None
- Related: ADR-AI-001, AFX-GOLDEN-LOCAL-001

## Context

The governed Local-First workflow can remain queued indefinitely when no repository self-hosted runner is online with all required labels. The repository is public, and GitHub-hosted standard Linux runners are available without a persistent external host. The first real OpenCode/Ollama run successfully installed Qwen2.5-Coder 14B, but the model emitted a bare JSON edit payload as assistant text rather than a native tool call; the mandatory task-scope guard correctly stopped publication because no file changed. We therefore select Qwen3 14B, pin a 32K context in a derived Ollama model, and require both native Ollama tool-call verification and an OpenCode read-only tool-dispatch smoke test before executing engineering work.

## Decision

Retain both execution targets:
- `github-hosted`: the default for marker-authorized push runs and the default manual selection. Use an ephemeral `ubuntu-24.04` VM, install Ollama, pull `qwen3:14b` and create `afaghx-qwen3:14b-32k` with `num_ctx=32768`, and run inference locally on that VM. Do not call a paid model API.
- `self-hosted`: keep the existing selector `[self-hosted, linux, x64, afaghx-ai]` for a provisioned and online runner with the same `afaghx-qwen3:14b-32k` custom model and runtime prerequisites.

The hosted path is an explicit infrastructure fallback, not a claim that a user-owned self-hosted machine exists or is online. It fails closed if the disk safety budget, model startup, or required runtime checks fail.

## Security and governance

- Keep the `afaghx-ai-execute` protected environment and immutable SHA / remote branch freshness gates for all ordinary dispatches and self-hosted executions.
- A single `[AFX-HOSTED-EXECUTE-ONCE]` push marker may select the separate `afaghx-ai-hosted-execute` environment for one explicitly user-authorized, GitHub-hosted local-Ollama run. This exception contains no production secrets and is restricted to local inference plus scoped task verification and PR creation. The freshness gate binds the execution to that exact commit; the marker is not inherited by later commits. Human review and merge authority remain mandatory.
- Only the explicit `[AFX-GOLDEN-EXECUTE]` push marker or a deliberate workflow dispatch may authorize the agent job.
- Ollama inference occurs on the selected runner; do not add paid provider credentials or expose publication tokens to the model process.
- Keep the task scope guard, deterministic tests, secret scans, evidence artifact upload, isolated result branch, and human review.
- The task workflow may report task-scoped `TESTED` evidence only. It must never assert system `PROVEN` or Production readiness.
- A hosted-runner setup failure must remain a failure, not trigger a paid-provider fallback.
- Before task execution, validate native Ollama `message.tool_calls` and run a separate OpenCode smoke invocation that must execute the allowed read-only `pwd` tool and return a sentinel. Raw JSON in assistant text is a hard failure; never parse it as a substitute for the tool protocol.
- Disable OpenCode V2's automatic `opencode.provider.ollama` discovery for this explicitly configured model and pin the native local endpoint. Set provider `timeout=false`, `headerTimeout=false`, and `chunkTimeout=1200000` so automatic discovery cannot replace explicit transport settings or cut off a quiet local generation at the default five-minute boundary. Keep the smoke command finite with a 600-second process cap.
- Observed proof from Run #38711087973: native Ollama tool-call verification passed; the separate OpenCode tool-dispatch request then failed after exactly 300 seconds with `Transport: The socket connection was closed unexpectedly`. The run produced no agent change or artifact, and downstream engineering steps were skipped. This is a hard failed attempt, not accepted evidence. The remediation above must be validated in a fresh run on the exact current SHA.
- The selected model is `ollama/afaghx-qwen3:14b-32k`, derived from `qwen3:14b` with `PARAMETER num_ctx 32768`; model ID, tool capability, context limit, native tool call, and OpenCode dispatch are regression-tested.

## Four-protocol bounded retest — 2026-10-15

- Run `38711087973` failed during the OpenCode tool-dispatch smoke. Ollama's native tool-call gate had passed; OpenCode closed the transport after the previous 300-second request boundary. This is failure evidence, not a successful execution.
- Run `38712520698` again passed model bootstrap, model/context validation, and `OLLAMA_TOOL_CALL_GATE=PASS`. The read-only OpenCode tool-dispatch smoke then reached the workflow's `timeout 600s` process cap and failed; the agent and all downstream gates were correctly skipped.
- Remediation: increase the job ceiling to 90 minutes, the pre-engineering OpenCode tool-dispatch smoke ceiling to 1,800 seconds, and the governed agent execution ceiling to 3,600 seconds. The local-provider contract test asserts these exact limits. This is a bounded retry, not a waiver of the OpenCode tool-dispatch gate.
- A single fresh retry is authorized only for this exact commit through the `[AFX-GOLDEN-EXECUTE]` and `[AFX-HOSTED-EXECUTE-ONCE]` commit markers. It must validate source SHA and remote branch freshness, use local Ollama only, and publish a scoped PR plus machine evidence only after every gate passes. It cannot merge, deploy, or issue system-level `PROVEN` or Production status.

## Four-protocol correction and fresh exact-SHA run — 2026-10-15

- The Architecture Gate on prior candidate `89ffbdb0d2cec8e514962cf7a9c75cc4e9331c67` exposed a stale regression assertion that still expected `timeout 600s`. This contradicted the explicitly bounded remediation in the workflow.
- Corrected the assertion in `.ai/runtime/ai-assistant-runtime.contract.test.mjs` to enforce `timeout-minutes: 90`, `timeout 1800s opencode run`, and `timeout 3600s bash scripts/ai/run-local-agent.sh`.
- After the correction, the following PR checks passed on exact SHA `166edd0f8a724b662885324b20c032d183c7115b`: AFAGHX AI Architecture Gate, AFAGHX AI Evidence Gate, AFX-CORE Gate 01 (including bootstrap security checks), and AFX-CORE Security. These results validate the code/test-gate correction, not actual model execution.
- The earlier run `38721659185` remains bound to its original SHA and is not accepted as final evidence if remote freshness validation fails.
- This commit authorizes one new exact-SHA hosted local-Ollama execution of `AFX-GOLDEN-LOCAL-001`, on the updated contract-tested branch. Required gates remain unchanged: immutable SHA, local-only model, native Ollama tool-call proof, actual OpenCode read-only tool dispatch, scoped agent output, deterministic tests, task-scoped evidence, secret scan, fresh-branch check, isolated PR and uploaded evidence. Any failed/unknown gate blocks issuance. No merge, deployment, system-level `PROVEN`, or Production status is authorized by this task.

## Trade-offs

The GitHub-hosted path downloads the model on an ephemeral VM and can be slower than a persistent machine. It has no model-state persistence between runs. The repository's public visibility permits use of standard GitHub-hosted Linux runners under GitHub's current public-repository policy; this decision must be reviewed if repository visibility or runner policy changes.
