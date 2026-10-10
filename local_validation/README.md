# AFAGHX CrewAI Engineering Assistant v1

This is the governed CrewAI coding-assistant project for the AFAGHX repository. The JSON-first configuration lives in `crew.jsonc` and `agents/*.jsonc`; `main.py` explicitly instantiates and wires the configured CrewAI agents, tasks, and custom tools. It is separate from the AI Engineering Command Center in `.ai/`.

## Capabilities and limits

- Four sequential roles: architecture/security audit, implementation, independent testing, and evidence/final gate.
- The only configured direct engineering model is `openai/gpt-5.6-sol`. No fallback provider is configured.
- Custom tools provide bounded source reading/search, guarded source writes, and a fixed test allowlist.
- Source writes are disabled by default. A real run requires `AFAGHX_WRITE_ENABLED=1`, a clean Git worktree, a named feature branch with an approved prefix (`ai/`, `feat/`, `fix/`, `crewai/`, or `codex/`), and an allowlisted source/test path.
- The assistant cannot write `AGENTS.md`, `.ai/`, `.github/`, infrastructure, database migrations, docs, secrets, or its own CrewAI configuration. It cannot commit, push, merge, deploy, or access production systems.
- Memory and delegation are disabled. The final task writes `output/final-gate.md`.
- Structural and runtime-assembly tests require no API key. A real run calls the configured model and may incur API costs.
- Test subprocesses receive a minimal non-sensitive environment. They do not inherit OpenAI, GitHub, cloud, deploy credentials, or the source-write switch.

A human must inspect the diff and evidence, run relevant tests independently, and create/review the pull request. CI success does not equal production proof.

## Install on Windows

From the repository root in PowerShell:

    cd local_validation
    py -3.12 --version
    py -3.12 -m venv .venv
    .\.venv\Scripts\Activate.ps1
    python -m pip install --upgrade pip
    pip install -e .

Do not commit credentials or place them in repository files. The `env.example` file only documents configuration names.

## Zero-cost validation (no model call)

Run from `local_validation`:

    python validate_project.py
    python main.py --validate-only
    python -m unittest discover -s tests -v

These commands validate CrewAI JSON configuration, instantiate the four real CrewAI Agent objects and Task objects without a provider call, check task context wiring, and test the governance/tool contracts. They do not prove actual model execution.

## Execute one narrow coding task

1. From the repository root, create and switch to a clean feature branch, for example: `git switch -c ai/fix-one-specific-defect`.
2. In a PowerShell session, enter the API key as hidden input. Never paste it into chat, source files, command literals, issues/PRs, or logs.
3. Set `AFAGHX_WRITE_ENABLED=1` only after reviewing the exact task and confirming the branch and working tree are safe.
4. From `local_validation`, run `python main.py --request "one narrow, testable coding task"`.
5. Inspect the resulting diff and `output/final-gate.md`; run applicable tests independently.
6. A human commits and opens/reviews a PR. The agent does not commit, push, merge, or deploy.

Example process-scoped session (hidden key input; no key in command history):

    $secure = Read-Host "OpenAI API key (hidden input)" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
      $env:AFAGHX_WRITE_ENABLED = "1"
      python main.py --request "Fix one specifically identified defect and add a focused regression test"
    } finally {
      Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
      Remove-Item Env:AFAGHX_WRITE_ENABLED -ErrorAction SilentlyContinue
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }

Run only after confirming valid provider access and available API quota. If quota is unavailable, execution must stop with the real provider error; it must not switch to another direct engineering model or fabricate success.

The runtime refuses a real run if the API key is absent, the explicit source-write opt-in is missing, the current branch is not allowlisted, or the Git worktree is dirty. The write tool separately validates every target path and rejects secret-like content.

## Truth model

- PASS from structural validation and runtime assembly means `TESTED` only.
- Missing tests are `NOT RUN`; failing tests are `FAIL`.
- This project cannot declare `PROVEN` or `PRODUCTION_READY`.
- A real CrewAI run plus passing deterministic tests is still not equivalent to independent human review, merged CI evidence, or production proof.
