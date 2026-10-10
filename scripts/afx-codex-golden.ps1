[CmdletBinding()]
param(
    [string]$TaskId = "AFX-GOLDEN-001"
)

$ErrorActionPreference = "Stop"

function Invoke-Captured {
    param(
        [string]$Name,
        [string[]]$Arguments,
        [string]$OutputFile
    )

    & $Name @Arguments 2>&1 | Tee-Object -FilePath $OutputFile
    return $LASTEXITCODE
}

$repoRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) {
    throw "Not inside a Git repository."
}
Set-Location $repoRoot

$currentBranch = (& git branch --show-current).Trim()
$dirty = (& git status --porcelain).Trim()
if ($dirty) {
    throw "Working tree is not clean. Commit/stash local changes before Golden Execution."
}

if ($currentBranch -eq "main") {
    git switch -c "ai/codex-golden-001"
    $currentBranch = (& git branch --show-current).Trim()
}
elseif ($currentBranch -ne "ai/codex-golden-001") {
    Write-Host "Current branch: $currentBranch"
    Write-Host "Creating isolated Golden branch from the current clean HEAD."
    git switch -c "ai/codex-golden-001"
    $currentBranch = (& git branch --show-current).Trim()
}

if ($currentBranch -eq "main") {
    throw "Golden Execution cannot run on main."
}

$evidenceDir = Join-Path $repoRoot "agent-evidence"
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

$baselineSha = (& git rev-parse HEAD).Trim()
$timestamp = (Get-Date).ToUniversalTime().ToString("o")

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw "npm is required to install/update Codex CLI."
    }
    npm install -g @openai/codex@latest
    if ($LASTEXITCODE -ne 0) {
        throw "Codex CLI installation failed."
    }
}

$codexVersion = (& codex --version 2>&1 | Out-String).Trim()
$env:AFX_TASK_ID = $TaskId

# Prevent accidental API-key billing on this zero-cost local path.
$previousApiKey = $env:OPENAI_API_KEY
Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue

$objective = @"
Act as AFX-AI-CEA-001 for AFAGHX.
Read AGENTS.md, .ai/command-center.yaml, .ai/providers.yaml,
.ai/tasks/queue.json, .ai/contracts/AFX-AI-CEA-001-v2.md,
.ai/policies/engineering.md, and .ai/runtime/.

Execute only $TaskId.
This is the real Golden Execution path.
Work only in the current isolated branch.
Make the smallest substantive repository change required by the task.
Do not modify main, AGENTS.md, .ai/policies, secrets, or production.
Preserve AFX-CORE as the sole identity/authentication/authorization authority.
Preserve Gateway -> PersistentAfxCore -> PostgreSQL.
Run every verification command required by the task.
Record exact model identity, commands, exit codes, changed files, and evidence.
Do not self-approve or merge.
Do not fabricate GREEN or PROVEN.
PROVEN is valid only when the real model execution succeeds and repository change,
tests, and machine-readable evidence all exist.
Do not push or open a PR unless explicitly required by the task.
"@

$promptFile = Join-Path $evidenceDir "codex-golden-prompt.txt"
Set-Content -Path $promptFile -Value $objective -Encoding UTF8

$codexLog = Join-Path $evidenceDir "codex-golden-exec.log"
$codexMessage = Join-Path $evidenceDir "codex-golden-last-message.txt"

Write-Host "=== AFAGHX CODEX GOLDEN EXECUTION ==="
Write-Host "Task:       $TaskId"
Write-Host "Branch:     $currentBranch"
Write-Host "Baseline:   $baselineSha"
Write-Host "Codex:      $codexVersion"
Write-Host "Model:      gpt-5.6-sol"
Write-Host "Auth path:  Codex local / ChatGPT sign-in (no OPENAI_API_KEY)"
Write-Host ""

$codexArgs = @(
    "exec",
    "--model", "gpt-5.6-sol",
    "--sandbox", "workspace-write",
    "--ask-for-approval", "never",
    "--output-last-message", $codexMessage,
    $objective
)

$codexExit = Invoke-Captured -Name "codex" -Arguments $codexArgs -OutputFile $codexLog

if ($null -ne $previousApiKey) {
    $env:OPENAI_API_KEY = $previousApiKey
}

$verification = @(
    @("node", @("--test", ".ai/runtime/gpt56-provider.contract.test.mjs")),
    @("node", @("--test", ".ai/runtime/golden-execution.contract.test.mjs")),
    @("node", @("--test", "platform/Gateway/runtime.integration.test.mjs")),
    @("npm", @("--prefix", "core/AFX-CORE", "run", "test:security"))
)

$testResults = @()
foreach ($item in $verification) {
    $name = [string]$item[0]
    $args = [string[]]$item[1]
    $safeName = ($name + "-" + (($args -join "-") -replace '[^A-Za-z0-9._-]', '_'))
    $outFile = Join-Path $evidenceDir ("test-" + $safeName + ".log")
    $exit = Invoke-Captured -Name $name -Arguments $args -OutputFile $outFile
    $testResults += [ordered]@{
        command = @($name) + $args
        exit_code = $exit
        output = $outFile.Replace($repoRoot + [IO.Path]::DirectorySeparatorChar, "")
    }
}

$diffCheckLog = Join-Path $evidenceDir "git-diff-check.log"
$diffExit = Invoke-Captured -Name "git" -Arguments @("diff", "--check") -OutputFile $diffCheckLog

$headSha = (& git rev-parse HEAD).Trim()
$manifest = @(& git diff --name-status)

$truthState = "UNKNOWN"
if ($codexExit -eq 0 -and $diffExit -eq 0 -and $testResults.Count -gt 0 -and ($testResults | Where-Object { $_.exit_code -ne 0 }).Count -eq 0 -and $headSha -ne $baselineSha) {
    $truthState = "PROVEN"
}

$evidence = [ordered]@{
    schema_version = "AFX-AI-CEA-LOCAL-GOLDEN-EVIDENCE-1"
    task_id = $TaskId
    started_at_utc = $timestamp
    finished_at_utc = (Get-Date).ToUniversalTime().ToString("o")
    branch = $currentBranch
    baseline_sha = $baselineSha
    head_sha = $headSha
    model = "gpt-5.6-sol"
    auth_path = "Codex local / ChatGPT sign-in"
    api_key_used = $false
    codex_version = $codexVersion
    codex_exit_code = $codexExit
    git_diff_check_exit_code = $diffExit
    changed_files = $manifest
    verification = $testResults
    truth_state = $truthState
    unknown_is_not_green = $true
    human_merge_required = $true
}

$evidencePath = Join-Path $evidenceDir "afx-codex-golden-evidence.json"
$evidence | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host ""
Write-Host "=== FINAL RESULT ==="
Write-Host "Truth state: $truthState"
Write-Host "Evidence:    $evidencePath"
Write-Host "Baseline:    $baselineSha"
Write-Host "Head:        $headSha"

if ($truthState -ne "PROVEN") {
    Write-Warning "Golden Execution did not satisfy PROVEN criteria. UNKNOWN is not GREEN."
    exit 1
}

Write-Host "PROVEN: real Codex execution + repository change + deterministic tests + machine evidence."
exit 0
