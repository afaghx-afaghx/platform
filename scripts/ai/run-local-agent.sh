#!/usr/bin/env bash
set -euo pipefail

TASK_ID="${TASK_ID:-AFX-GOLDEN-LOCAL-001}"
MODE="${MODE:-golden-execution}"
MODEL="${AFAGHX_LOCAL_MODEL:-afaghx-qwen3:14b-32k}"
MODEL="${MODEL#ollama/}"
BASELINE_SHA="${GITHUB_SHA:?GITHUB_SHA is required}"

command -v opencode >/dev/null 2>&1 || { echo "opencode_not_installed" >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git_not_installed" >&2; exit 1; }

# Keep provider, SCM, and cloud credentials out of the model process.
# The workflow uses its scoped GH_TOKEN only in later publication steps.
while IFS= read -r name; do
  case "$name" in
    *_API_KEY|API_KEY|*_TOKEN|TOKEN|*_SECRET|SECRET|*_PASSWORD|PASSWORD|*_CREDENTIALS|CREDENTIALS|DATABASE_URL|DB_URL|*_DATABASE_URL|*_DB_URL|PG*|POSTGRES*|MONGO*|REDIS*|AWS_*|AZURE_*|GCP_*|ACTIONS_ID_TOKEN_*|GOOGLE_APPLICATION_CREDENTIALS)
      unset "$name"
      ;;
  esac
done < <(compgen -e)

cat > agent-execution-prompt.md <<EOF
You are AFX-AI-CEA-001, the AFAGHX Chief Engineering Agent.

MODE: ${MODE}
TASK: ${TASK_ID}
BASELINE: ${BASELINE_SHA}

GOVERNING ORDER:
MISSION -> BASELINE -> FORENSICS -> ARCHITECTURE IMPACT -> SECURITY IMPACT
-> PLAN -> IMPLEMENT -> TEST -> EVIDENCE -> GATE -> PR.

Read AGENTS.md, .ai/command-center.yaml, .ai/providers.yaml, .ai/tasks/queue.json,
.ai/runtime/*, .ai/agents/*, .ai/policies/*, .ai/architecture/*,
.ai/contracts/* and .ai/evidence/*.

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

Before editing:
- Read the actual target file and inspect the exact existing test structure.
- Never assume a placeholder or use an oldString that is not present in the file.
- Use OpenCode's actual read/edit tools; do not print a JSON tool payload as a substitute for executing an edit.
- After editing, read the target back and verify a real diff exists on the required path.

Required substantive change:
Add a new Node.js test case named "Qwen3 local tool-calling capability is explicitly pinned" to the existing target file. It must assert the configured model is `ollama/afaghx-qwen3:14b-32k`, the provider declares `capabilities.tools === true`, the context limit is 32768, and the workflow includes both the Ollama native tool-call gate and the OpenCode tool-dispatch gate. Keep the test read-only and use the existing imports/helper.

The test must also preserve verification of the local-first provider contract, the governed OpenCode configuration, and the prohibition on paid-provider dependency for the primary path.

Finish with concise execution notes in:
agent-execution-notes.md
EOF

opencode run --standalone --model "ollama/${MODEL}" --agent afaghx-engineer --format default "$(cat agent-execution-prompt.md)" | tee agent-execution-report.md
