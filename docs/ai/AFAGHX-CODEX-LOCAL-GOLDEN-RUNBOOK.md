# AFAGHX Codex Local Golden Execution Runbook

## Purpose

Run the AFAGHX Chief Engineering Agent locally through Codex using the user's ChatGPT authentication path, without requiring an OpenAI API key.

This is the only approved local path for a real engineering execution when the GitHub Actions API-key path is unavailable.

## Non-negotiable rules

- Read `AGENTS.md` first.
- Never work on `main`.
- Use an isolated branch.
- Preserve AFX-CORE as the only identity/authentication/authorization authority.
- Preserve `Gateway -> PersistentAfxCore -> PostgreSQL`.
- Never access raw secrets.
- Never fabricate evidence.
- Never call LOCAL validation `PROVEN`.
- A real Codex execution may only claim `PROVEN` when the model receipt, repository diff, tests, and evidence all exist.
- Human review remains the merge authority.

## Windows PowerShell

### 1. Open the repository

```powershell
cd C:\path\to\platform
git status
```

### 2. Install/update Codex CLI

```powershell
npm install -g @openai/codex@latest
codex --version
```

### 3. Sign in with ChatGPT

Start Codex:

```powershell
codex
```

Complete the ChatGPT sign-in flow.

### 4. Create an isolated branch

```powershell
git switch -c ai/codex-golden-001
```

If the branch already exists:

```powershell
git switch ai/codex-golden-001
```

Never run the task from `main`.

### 5. Run the governed Golden task

For the first run, use the interactive Codex client and send exactly this objective:

> Act as AFX-AI-CEA-001 for AFAGHX. Read AGENTS.md, .ai/command-center.yaml, .ai/providers.yaml, .ai/tasks/queue.json, .ai/contracts/AFX-AI-CEA-001-v2.md, .ai/policies/engineering.md, and .ai/runtime/. Execute only AFX-GOLDEN-001. Work only in the current isolated branch. Make the smallest substantive change required by the task. Run the required deterministic tests. Record the exact model identity visible in your runtime, commands, exit codes, changed files, and evidence. Never modify main, secrets, AGENTS.md, or .ai/policies. Never self-approve or merge. Do not claim PROVEN unless the real model execution, repository change, tests, and evidence are all present.

### 6. Mandatory local verification

```powershell
node --test .ai/runtime/gpt56-provider.contract.test.mjs
node --test .ai/runtime/golden-execution.contract.test.mjs
node --test platform/Gateway/runtime.integration.test.mjs
npm --prefix core/AFX-CORE run test:security
```

Run the persistence suite too when the local PostgreSQL environment is available:

```powershell
npm --prefix core/AFX-CORE run test:persistence
```

### 7. Capture evidence

The evidence must contain:

- baseline SHA
- head SHA
- model identity reported by Codex
- exact commands
- exit codes
- changed-file manifest
- test output
- Codex execution report
- no-secret scan result

### 8. Final repository check

```powershell
git status
git diff --check
git diff --name-status
```

Do not merge locally.

### 9. Push only the isolated branch after human inspection

```powershell
git push -u origin ai/codex-golden-001
```

Open a PR against `main`. Human review remains mandatory.

## Truth model

```
Local contract validation       -> TESTED
Codex real Golden execution    -> PROVEN only with complete evidence
Human review + merge            -> release authority
Production                      -> separate gate
```

A missing model receipt, missing tests, unavailable runtime, or incomplete evidence is `UNKNOWN`, never `PROVEN`.

## API-key path

The GitHub Actions workflow that invokes `openai/codex-action` remains available for a future API-funded execution. Do not insert a fabricated key or billing workaround.
