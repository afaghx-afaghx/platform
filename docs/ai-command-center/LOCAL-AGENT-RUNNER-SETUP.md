# AFAGHX Local Agent Runner Setup

## Purpose

This is the free-first execution path for AFX-AI-CEA-001.

The primary provider is a local Ollama model. OpenAI is optional and is not required for the primary Agent path.

## Security model

The local Agent runner is used only by the manual `workflow_dispatch` workflow and is protected by the existing GitHub Environment `afaghx-ai-execute`.

Do not use this self-hosted runner for pull_request-triggered workflows.

GitHub warns that self-hosted runners in public repositories can be exposed to untrusted code from forks and recommends using them with private repositories. The AFAGHX workflow therefore does not execute on pull_request events and keeps the runner behind an Environment approval gate.

## Recommended host

A dedicated Linux machine or WSL2 Ubuntu installation is the preferred host.

The host must have:

- Git
- Docker
- Ollama
- OpenCode
- GitHub Actions self-hosted runner

The runner must use these labels:

`self-hosted`, `linux`, `x64`, `afaghx-ai`

## Local model

Default model:

`qwen2.5-coder:14b`

You may select another locally installed Ollama coding model from the workflow input.

Before execution, the machine must report the selected model in:

`ollama list`

and Ollama must answer:

`http://127.0.0.1:11434/api/tags`

## One-time runner registration

On GitHub open:

`Settings -> Actions -> Runners -> New self-hosted runner`

Select Linux/x64 and follow GitHub's generated commands on the host.

Do not place the runner registration token in the repository.

After registration, verify the runner appears online with the label `afaghx-ai`.

## Local Agent runtime check

Run the repository health workflow manually:

`AFAGHX Local Agent Runner Health`

It checks Ollama, OpenCode, Docker, GitHub CLI and the required local model.

## Golden execution

After the health workflow is green, run:

`AFAGHX Autonomous Engineering Agent — Local-First`

Use:

- mode: `golden-execution`
- task: `AFX-GOLDEN-LOCAL-001`
- model: `ollama/qwen2.5-coder:14b`

The Agent itself never commits, pushes, merges or creates a PR. The workflow performs the governed branch/PR actions only after the evidence gates pass.

## Windows note

For Windows hosts, use WSL2 Ubuntu for the runner and Docker environment. OpenCode's current documentation recommends WSL for the best Windows compatibility.

## Evidence requirement

A local model is not considered proven merely because it returns text. AFAGHX requires:

`REAL LOCAL MODEL -> IMPLEMENT -> TEST -> EVIDENCE -> GATE -> ISOLATED BRANCH -> PR`

No evidence means no GREEN.
