# AFAGHX CrewAI Engineering Assistant v1

This is the canonical CrewAI coding-assistant project for the AFAGHX repository. It uses CrewAI's JSON-first project layout: crew.jsonc plus agents/*.jsonc. It is separate from the AI Engineering Command Center in .ai/.

## Capabilities and limits

- Four sequential roles: architecture/security audit, implementation, independent testing, and evidence/final gate.
- The only configured model is openai/gpt-5.6-sol. No model fallback or alternate direct engineering provider is configured.
- Custom tools provide bounded source reading/search, guarded source writes, and a fixed test allowlist.
- Source writes are disabled by default. They require AFAGHX_WRITE_ENABLED=1, a task branch with an approved prefix (ai/, feat/, fix/, crewai/, or codex/), and an allowlisted source/test path.
- The assistant cannot write AGENTS.md, .ai/, .github/, infrastructure, database migrations, docs, secrets, or its own CrewAI configuration. It cannot commit, push, merge, deploy, or access production systems.
- Memory is disabled. The last task writes output/final-gate.md.
- Structural/local tests require no API key. A real crewai run calls the configured model and may incur API costs.
- Test subprocesses receive a minimal non-sensitive environment. They do not inherit OpenAI, GitHub, cloud, deploy credentials, or the source-write switch.

A human must inspect the diff and evidence, run relevant tests, and create/review the pull request. CI success does not equal production proof.

## Install on Windows

From the repository root in PowerShell:

    cd local_validation
    py -3.12 --version
    py -3.12 -m venv .venv
    .\.venv\Scripts\Activate.ps1
    python -m pip install --upgrade pip
    pip install -e .

Do not copy env.example to a .env file inside the checkout for an agent run. Keep API credentials outside the repository files. The env.example file only documents the names of local environment settings.

## Zero-cost validation (no model call)

Run from local_validation:

    python validate_project.py
    python -m unittest discover -s tests -v

These validate JSONC wiring, agent/task/tool references, path and branch guards, secret detection, test allowlisting, and truth-state boundaries. They do not prove model execution.

## Execute one narrow coding task

1. From the repository root, create and switch to a clean feature branch, for example: git switch -c ai/fix-one-specific-defect.
2. Start a secure, process-scoped API-key session in PowerShell below. Do not paste the key into chat, the repository, a command literal, issue/PR text, or logs.
3. Keep the task request in crew.jsonc narrow and specific. Only set AFAGHX_WRITE_ENABLED=1 for an explicitly approved code-writing run on a clean feature branch.
4. Run crewai install and crewai run.
5. Inspect the resulting working-tree diff and output/final-gate.md. Run applicable tests independently.
6. A human commits and opens/reviews a PR. The agent does not commit, push, merge, or deploy.

Example secure process-scoped run (input is hidden; the key is not included in command history):

    $secure = Read-Host "OpenAI API key (hidden input)" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
      $env:AFAGHX_WRITE_ENABLED = "1"
      crewai install
      crewai run
    } finally {
      Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
      Remove-Item Env:AFAGHX_WRITE_ENABLED -ErrorAction SilentlyContinue
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }

Run only after confirming valid provider access and available API quota. If the key lacks quota, the crew must report the real provider failure; it must not switch to a different direct engineering model or fabricate success.

The source-write tool checks the actual Git branch at runtime. It fails closed when repository root resolution fails, the branch is protected/unnamed, the opt-in is absent, the path is outside approved roots, a path escapes the checkout, or secret-like content is detected.

## Truth model

- PASS from structural validation means TESTED only.
- Missing tests are NOT RUN; failing tests are FAIL.
- This project cannot declare PROVEN or PRODUCTION_READY.
- A real CrewAI run plus passing deterministic tests is still not equivalent to independent human review, merged CI evidence, or production proof.
