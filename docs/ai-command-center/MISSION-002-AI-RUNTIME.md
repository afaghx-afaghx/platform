# MISSION-002 — Governed AI Runtime

## Objective
Complete the production provider boundary, role-separated agent registry, and Mission Engine without granting AI direct merge or secret authority.

## Runtime
- OpenAI Responses API adapter: `intelligence/ai_gateway/openai_provider.py`
- Provider: `openai-codex`
- Default model: `gpt-5.6-luna`
- Secret: `OPENAI_API_KEY` from GitHub Environment `afaghx-ai-execute`
- Network access: explicit and isolated to the provider boundary
- API credits: required and reported explicitly

## Agent roles
1. Architect — architecture and boundary decisions
2. Planner — mission decomposition and acceptance criteria
3. Implementer — code and deterministic tests
4. Security Reviewer — adversarial security review
5. Test Engineer — validation
6. Evidence Auditor — evidence integrity and gate readiness

No agent can merge, change secrets, bypass AFX-CORE, or make an unreviewed destructive production change.

## Mission lifecycle
`Mission → Plan → Code → Test → Evidence → Gate → PR → Human Review → Merge`

The Mission Engine performs plan, implementation, review/test, and evidence summarization through the AI Gateway. Provider selection and mode authorization remain policy-controlled.

## Acceptance
- Offline contract tests pass without network or API credits.
- Unknown provider/mode operations fail closed.
- Real OpenAI execution requires the governed GitHub Environment and `OPENAI_API_KEY`.
- Live execution produces machine-readable evidence containing provider, model, mission ID, status, and output hashes.
- Human review remains mandatory before merge.

## Current limitation
A live OpenAI run cannot be declared GREEN until the API account has available credits. The provider integration can be validated structurally and through offline contract tests first.
