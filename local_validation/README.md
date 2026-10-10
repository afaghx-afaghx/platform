# AFAGHX CrewAI Engineering Assistant v1

This is the canonical CrewAI coding-assistant project for the AFAGHX repository. It uses the current JSON-first CrewAI layout: crew.jsonc plus agents/*.jsonc. It is intentionally separate from the AI Engineering Command Center in .ai/.

## Capabilities and limits

- Four sequential roles: architecture/security audit, implementation, independent testing, and evidence/final gate.
- The only configured model is openai/gpt-5.6-sol. No model fallback, Together.ai, or alternate direct engineering provider is configured.
- Custom tools provide bounded source reading/search, guarded source writes, and a fixed test allowlist.
- Source writes are disabled by default. They require AFAGHX_WRITE_ENABLED=1, a task branch named with an approved prefix (ai/, feat/, fix/, crewai/, or codex/), and an allowlisted source/test path.
- The assistant cannot write AGENTS.md, .ai/, .github/, infrastructure, database migrations, docs, secrets, or its own CrewAI configuration. It cannot run arbitrary shell commands, commit, push, merge, deploy, or access production systems.
- Memory is disabled; only a final report is written to output/final-gate.md.
- Structural/local tests require no API key and do not call an LLM. crewai run invokes the configured paid model and may incur API costs.

The implementation model can propose source changes on a clean isolated branch. A human must inspect the working-tree diff and generated evidence, then commit and create/review the pull request. CI success does not equal production proof.

## Install (Windows PowerShell)

From the repository root:

    cd local_validation
    py -3.12 --version
    py -3.12 -m venv .venv
    .\.venv\Scripts\Activate.ps1
    python -m pip install --upgrade pip
    pip install -e .
    Copy-Item env.example .env

Open .env in a local editor. Only set OPENAI_API_KEY in your local untracked .env; never paste it into chat, source files, logs, or a pull request. Keep AFAGHX_WRITE_ENABLED=0 until you have checked out a clean feature branch and approved a narrow task.

## Zero-cost validation (no model call)

Run from the local_validation directory:

    python validate_project.py
    python -m unittest discover -s tests -v

These checks validate JSON/config wiring, custom-tool references, branch/path guards, and truth-state boundaries. They do not prove an actual model execution.

## Execute one coding task

1. From the repository root, create and switch to a clean branch, for example: git switch -c ai/fix-one-specific-defect.
2. Return to this directory and make sure the .env contains your locally managed API key.
3. Set AFAGHX_WRITE_ENABLED=1 in .env only after reviewing the task and accepting branch-local source writes.
4. Enter one narrow task in the request input in crew.jsonc; avoid broad refactors.
5. Run crewai install, then crewai run.
6. Inspect the working-tree diff and output/final-gate.md. Run relevant tests independently.
7. Commit and open a pull request yourself; human review and repository CI are mandatory.

The source-write tool checks the actual Git branch at runtime. It fails closed when the repository root is unavailable, the branch is protected/unnamed, write opt-in is absent, the target is outside approved roots, a path escapes the checkout, or secret-like content is detected.

## Truth model

- PASS from structural validation means TESTED only.
- Missing tests are NOT RUN; failing tests are FAIL.
- This project does not declare PROVEN or PRODUCTION_READY.
- A real CrewAI run plus passing deterministic tests is still not equivalent to independent human approval or production evidence.
