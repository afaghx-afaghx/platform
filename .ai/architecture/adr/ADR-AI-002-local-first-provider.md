# ADR-AI-002 — Local-First Provider for AFX-AI-CEA-001

- Status: Accepted
- Date: 2026-09-20
- Scope: AFX-AI-CEA-001 provider execution

## Decision

The AFAGHX Chief Engineering Agent uses a provider-agnostic execution boundary with a local-first default.

Primary provider:
`local-ollama`

Optional cloud provider:
`openai-codex`

The local path is executed on a dedicated GitHub Actions self-hosted runner using OpenCode with Ollama and a local coding model.

## Rationale

A paid external API must not be a single point of failure for the engineering control plane.

The provider layer is not an authority. Identity, authorization, architecture governance, evidence, gates, branch protection, and human merge authority remain unchanged.

## Execution

`MISSION -> BASELINE -> REAL LOCAL MODEL -> ISOLATED WORKSPACE -> IMPLEMENT -> TEST -> EVIDENCE -> GATE -> PR`

## Security

- Self-hosted runner label: `afaghx-ai`.
- Local Agent execution is manual-dispatch only; it is never triggered by arbitrary pull requests.
- The existing protected Environment `afaghx-ai-execute` remains the approval boundary.
- The Agent cannot push, merge, deploy, or create a PR.
- Protected governance files remain immutable.
- Secrets are never committed.
- The Local Agent receives no paid-provider credentials.
- Experience remains presentation-only.
- Canonical runtime remains Gateway -> PersistentAfxCore -> PostgreSQL.
- Local Provider has no production authority.

## Fallback

OpenAI Codex remains available only as an explicit optional provider. Absence of OpenAI credits must not stop the default local Agent path.
