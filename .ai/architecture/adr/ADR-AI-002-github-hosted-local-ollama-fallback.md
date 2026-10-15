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
- The selected model is `ollama/afaghx-qwen3:14b-32k`, derived from `qwen3:14b` with `PARAMETER num_ctx 32768`; model ID, tool capability, context limit, native tool call, and OpenCode dispatch are regression-tested.

## Trade-offs

The GitHub-hosted path downloads the model on an ephemeral VM and can be slower than a persistent machine. It has no model-state persistence between runs. The repository's public visibility permits use of standard GitHub-hosted Linux runners under GitHub's current public-repository policy; this decision must be reviewed if repository visibility or runner policy changes.
