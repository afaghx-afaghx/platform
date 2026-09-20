# AFAGHX Local Agent Runner Setup

## Purpose

This is the free-first execution path for AFX-AI-CEA-001. The primary provider is a local Ollama model executed through OpenCode. OpenAI remains optional and is not required for the primary path.

## Runner security

The local Agent workflow is manual-dispatch only and uses the existing protected GitHub Environment `afaghx-ai-execute`. It is not triggered by pull requests.

GitHub warns that self-hosted runners are risky for public repositories because untrusted forked code can potentially execute on the runner. Use this runner only for trusted/manual Agent execution and keep pull_request workflows on GitHub-hosted runners.

## Host

Use a dedicated Linux machine or WSL2 Ubuntu installation with:

- Git
- Docker
- Ollama
- OpenCode
- GitHub Actions self-hosted runner

The runner labels must include:

`self-hosted`, `linux`, `x64`, `afaghx-ai`

## Model

Default:

`qwen2.5-coder:14b`

The workflow accepts another local Ollama model as an explicit input.

The selected model must already be available in:

`ollama list`

Ollama must answer:

`http://127.0.0.1:11434/api/tags`

## Runner registration

On GitHub:

`Settings -> Actions -> Runners -> New self-hosted runner`

Register the Linux/x64 runner and assign the custom label `afaghx-ai`.

Never commit or publish the runner registration token.

## Health check

Run `AFAGHX Local Agent Runner Health` manually. It validates Ollama, OpenCode, Docker, GitHub CLI and the required local model.

## Golden execution

Run `AFAGHX Autonomous Engineering Agent — Local-First` manually with:

- mode: `golden-execution`
- task: `AFX-GOLDEN-LOCAL-001`
- model: `ollama/qwen2.5-coder:14b`

The Agent itself never commits, pushes, merges, deploys or creates a PR. The deterministic workflow performs those governed operations only after verification.

## Windows

For Windows, WSL2 Ubuntu is recommended for the runner and Docker environment. OpenCode currently recommends WSL for the best Windows compatibility.

## Evidence

The acceptance chain is:

`REAL LOCAL MODEL -> IMPLEMENT -> TEST -> EVIDENCE -> GATE -> ISOLATED BRANCH -> PR`

No evidence means no GREEN.
