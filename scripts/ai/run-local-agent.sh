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

# Qwen3 may otherwise spend the tool turn in reasoning and never dispatch a tool.
# OpenCode v2 merges this runtime-only provider body into each OpenAI-compatible request.
# This is local inference configuration; no external provider or credential is enabled.
export OPENCODE_CONFIG_CONTENT='{"providers":{"ollama":{"body":{"reasoning_effort":"none"}}}}'

# Treat the engineering brief as literal data. A quoted heredoc prevents backticks,
# command substitutions, and user-controlled values from being evaluated by Bash.
export AFX_PROMPT_MODE="$MODE"
export AFX_PROMPT_TASK_ID="$TASK_ID"
export AFX_PROMPT_BASELINE_SHA="$BASELINE_SHA"

cat > agent-execution-prompt.md <<'AFX_AGENT_PROMPT'
You are AFX-AI-CEA-001, AFAGHX's governed local engineering agent.

MODE: @@AFX_MODE@@
TASK: @@AFX_TASK_ID@@
BASELINE SHA: @@AFX_BASELINE_SHA@@

Follow AGENTS.md as the highest-level repository constitution. Preserve the boundaries:
AFX-CORE owns identity/authentication/authorization; Experience is presentation-only;
the runtime path is Gateway -> PersistentAfxCore -> PostgreSQL. No secrets, paid-provider
dependency, direct Experience-to-database access, commits, pushes, merges, or deployments.

Read only the relevant governance and task files first:
AGENTS.md, .ai/command-center.yaml, .ai/providers.yaml, .ai/tasks/queue.json,
.ai/runtime/local-provider.contract.test.mjs, opencode.json, and the local Ollama workflow.

Task: make one substantive change only in:
.ai/runtime/local-provider.contract.test.mjs

Check that the named test does not already exist before editing; do not create duplicates.
Use OpenCode's actual read/edit tools. Do not emit a JSON edit proposal instead of using the
edit tool. Add exactly one test named:
"Qwen3 local tool-calling capability is explicitly pinned"

Use the existing imports and read helper. The test must be read-only and assert:
- the configured model is `ollama/afaghx-qwen3:14b-32k`;
- `capabilities.tools === true`;
- context limit is 32768;
- the preflight contains `OLLAMA_TOOL_CALL_GATE=PASS` and
  `OLLAMA_OPENAI_TOOL_CALL_GATE=PASS`;
- the workflow contains `MODEL_CONTEXT_GATE=PASS`, the real OpenCode tool-dispatch
  step and `AFX-OPENCODE-TOOL-DISPATCH-PASS`;
- the workflow uses the governed `OPENCODE_CONFIG_CONTENT` override.

Preserve the existing local-first and no-paid-credentials assertions. The source validator requires an assertion for the command center's `unknown_is_not_green: true` fail-closed invariant. Add/retain a read-only assertion matching that flag in the contract test source. Do not modify
AGENTS.md, policies, queue, workflows, or any other source file. Read the target back
after editing and verify the new test occurs exactly once. Write concise factual notes
to agent-execution-notes.md. Do not claim tests or gates passed; the workflow runs those
checks after this agent exits.
AFX_AGENT_PROMPT

python3 - <<'PY'
import os
from pathlib import Path

prompt_path = Path("agent-execution-prompt.md")
prompt = prompt_path.read_text(encoding="utf-8")
values = {
    "@@AFX_MODE@@": os.environ["AFX_PROMPT_MODE"],
    "@@AFX_TASK_ID@@": os.environ["AFX_PROMPT_TASK_ID"],
    "@@AFX_BASELINE_SHA@@": os.environ["AFX_PROMPT_BASELINE_SHA"],
}
for placeholder, value in values.items():
    if "\n" in value or "\r" in value:
        raise SystemExit("prompt field contains a newline")
    prompt = prompt.replace(placeholder, value)
if any(placeholder in prompt for placeholder in values):
    raise SystemExit("unresolved placeholder in engineering prompt")
prompt_path.write_text(prompt, encoding="utf-8")
PY

unset AFX_PROMPT_MODE AFX_PROMPT_TASK_ID AFX_PROMPT_BASELINE_SHA

opencode run --standalone --model "ollama/${MODEL}" --agent afaghx-engineer --format default "$(cat agent-execution-prompt.md)" | tee agent-execution-report.md
