#!/usr/bin/env bash
set -euo pipefail

TASK_ID="${TASK_ID:-AFX-GOLDEN-LOCAL-001}"
MODEL="${AFAGHX_LOCAL_MODEL:-qwen2.5-coder:14b}"
MODEL="${MODEL#ollama/}"
BASELINE_SHA="${GITHUB_SHA:?GITHUB_SHA is required}"

command -v opencode >/dev/null 2>&1 || { echo "opencode_not_installed" >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git_not_installed" >&2; exit 1; }

export OPENAI_API_KEY=''
export ANTHROPIC_API_KEY=''
export AODEX_API_KEY=''
export REVIEW_AI_API_KEY=''

cat > agent-execution-prompt.md <<EOF
You are AFX-AI-CEA-001, the AFAGHX Chief Engineering Agent.

MODE: golden-execution
TASK: ${TASK_ID}
BASELINE: ${BASELINE_SHA}

GOVERNING ORDER:
MISSION -> BASELINE -> FORENSICS -> ARCHITECTURE IMPACT -> SECURITY IMPACT
-> PLAN -> IMPLEMENT -> TEST -> EVIDENCE -> GATE -> PR.

Read:
AGENTS.md
.ai/command-center.yaml
.ai/providers.yaml
.ai/tasks/queue.json
.ai/runtime/*
.ai/agents/*
.ai/policies/*
.ai/architecture/*
.ai/contracts/*
.ai/evidence/*

Execute only TASK in this isolated workspace.
You must make the required substantive repository change.
Do not edit AGENTS.md or .ai/policies/*.
Do not modify secrets or credentials.
Do not change canonical architecture without an ADR.
Preserve AFX-CORE as the only identity/authentication/authorization authority.
Preserve EXPERIENCE as presentation-only.
Preserve Gateway -> PersistentAfxCore -> PostgreSQL.
Never access a database directly from Experience.
Never push, merge, deploy, or create a pull request yourself.
Never create a local git commit.
Leave HEAD at BASELINE.
Run deterministic verification and remediate only safe failures introduced by your change.
Never fabricate evidence and never claim GREEN without evidence.

For ${TASK_ID}, the required substantive path is:
.ai/runtime/local-provider.contract.test.mjs

The test must verify the local-first provider contract, the Ollama endpoint/model contract,
the governed OpenCode configuration, and the prohibition on paid-provider dependency for the primary path.

Finish with concise execution notes in:
agent-execution-notes.md
EOF

opencode run   --standalone   --model "ollama/${MODEL}"   --agent afaghx-engineer   --format default   "$(cat agent-execution-prompt.md)"   | tee agent-execution-report.md
