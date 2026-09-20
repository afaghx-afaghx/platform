# ADR-AI-001 — Production-Grade Autonomous Engineering Agent

- Status: Accepted
- Date: 2026-09-20
- Scope: AFX-AI-CEA-001

## Decision
AFAGHX uses one governed autonomous engineering agent. The executable control plane is GitHub Actions plus the OpenAI Codex Action.

Execution:
MISSION -> BASELINE -> REAL MODEL -> ISOLATED WORKSPACE -> IMPLEMENT -> TEST -> EVIDENCE -> GATE -> PR

## Guardrails
- main is never modified directly by the Agent.
- The Agent works in an isolated workspace and leaves HEAD at the captured baseline.
- Protected governance files cannot be modified.
- Secrets are never written to the repository.
- The Agent does not push, merge, deploy or create the PR itself.
- The workflow performs branch push and PR creation.
- UNKNOWN/PARTIAL evidence is never GREEN.
- Human merge and production authority remain mandatory.

## Provider
Codex Action v1 is used with the repository Environment afaghx-ai-execute and OPENAI_API_KEY. The :workspace permission profile and drop-sudo safety strategy are used.

## Golden Execution
AFX-GOLDEN-001 is the acceptance task. It must produce the required substantive test change, pass the deterministic runtime/security gates, produce machine evidence, mark the task DONE, commit an isolated branch and create a governed PR.