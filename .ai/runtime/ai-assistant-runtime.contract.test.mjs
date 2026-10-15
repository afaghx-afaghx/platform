import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('every queued verification command is explicitly allowlisted by the task runner', async () => {
  const queue = JSON.parse(await read('../tasks/queue.json'));
  const architectureWorkflow = await read('../../.github/workflows/ai-architecture-gate.yml');
  const source = await read('./agent-loop.py');
  const allowlist = source.match(/ALLOWED\s*=\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(allowlist, 'the command allowlist must remain explicit');
  for (const task of queue.tasks) {
    for (const command of task.verification?.commands ?? []) {
      const tuple = `(${command.map(value => "'" + value.replaceAll("'", "\\\\'") + "'").join(',')})`;
      assert.ok(allowlist.includes(tuple), `queued command is not allowlisted: ${JSON.stringify(command)}`);
    }
  }
  const providerTask = queue.tasks.find(task => task.id === 'AFX-GOLDEN-LOCAL-001');
  assert.ok(providerTask, 'the local provider verification task must exist');
  assert.ok(
    providerTask.verification?.commands?.some(command =>
      JSON.stringify(command) === JSON.stringify(['node', '--test', '.ai/runtime/local-provider.contract.test.mjs'])
    ),
    'the local provider contract must be executed, not only syntax-checked'
  );
  assert.match(architectureWorkflow, /node scripts\/ai\/validate-local-provider-contract\.mjs/);
  assert.match(architectureWorkflow, /node --test \.ai\/runtime\/local-provider\.contract\.test\.mjs/);
});

test('runtime evidence directories are created even on a fresh checkout', async () => {
  const loop = await read('./agent-loop.py');
  const forensics = await read('./forensics.py');
  assert.match(loop, /OUT\.mkdir\(parents=True, exist_ok=True\)/);
  assert.match(forensics, /OUT\.mkdir\(parents=True, exist_ok=True\)/);
  assert.ok(loop.includes('"task-loop.md").write_text'));
  assert.doesNotMatch(loop, /\\\\n/, 'evidence writers must not serialize literal backslash-n text');
});

test('task execution can never self-promote to PROVEN or mutate the canonical queue', async () => {
  const loop = await read('./agent-loop.py');
  assert.match(loop, /truth_state = "TESTED" if success/);
  assert.match(loop, /verification_state = "GREEN" if success/);
  assert.ok(loop.includes('result.setdefault("truth_scope", "task_execution")'));
  assert.ok(loop.includes('result.setdefault("system_production_gate", "NOT_EVALUATED_BY_THIS_TASK_WORKFLOW")'));
  assert.doesNotMatch(loop, /"truth_state"\s*:\s*"PROVEN"/);
  assert.doesNotMatch(loop, /QUEUE\.write_text/);
});

test('local/cloud workflows delegate change manifests to the shared fail-closed scope guard', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const cloud = await read('../../.github/workflows/ai-engineering-command-center.yml');
  const guard = await read('./task_scope_guard.py');
  for (const [name, workflow] of [['local', local], ['cloud', cloud]]) {
    assert.match(workflow, /python3 \.ai\/runtime\/task_scope_guard\.py "\$TASK_ID" "\$MODE" "\$BASELINE_SHA"/, name);
    assert.match(workflow, /Enforce immutable task scope/, name);
  }
  assert.match(guard, /ls-files", "--others", "--exclude-standard", "-z"/);
  assert.match(guard, /"git", "add", "-N", "--"/);
  assert.match(guard, /"diff", "--name-only", "--no-renames", "-z"/);
});

test('dispatch values are passed through environment variables, not interpolated into shell statements', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const cloud = await read('../../.github/workflows/ai-engineering-command-center.yml');
  for (const [name, workflow] of [['local', local], ['cloud', cloud]]) {
    assert.doesNotMatch(workflow, /printf[^\n]*\$\{\{\s*inputs\.(?:task|mode|model)/, `${name} workflow must not interpolate dispatch input in shell printf`);
    assert.match(workflow, /TASK_ID:\s*\$\{\{\s*inputs\.task/, `${name} workflow must pass task id using env`);
    assert.match(workflow, /TRIGGER_EVENT:\s*\$\{\{\s*github\.event_name\s*\}\}/);
  }
  assert.match(local, /Validate local model selector/);
  assert.match(local, /ollama\/\[A-Za-z0-9\]/);
});

test('workflow final task check validates TESTED evidence without requiring queue mutation', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const cloud = await read('../../.github/workflows/ai-engineering-command-center.yml');
  const queue = JSON.parse(await read('../tasks/queue.json'));
  assert.equal(queue.tasks[0].truth_required, 'TESTED');
  assert.equal(queue.tasks[0].verification.truth_required, 'TESTED');
  assert.match(cloud, /default: AFX-GOLDEN-LOCAL-001/);
  for (const [name, workflow] of [['local', local], ['cloud', cloud]]) {
    assert.match(workflow, /Verify task-scoped execution evidence/, name);
    assert.match(workflow, /agent-evidence\/task-loop\.json/, name);
    assert.match(workflow, /truth_state.*TESTED/, name);
    assert.doesNotMatch(workflow, /task\.get\('status'\)\s*!=\s*'DONE'/, name);
  }
});

test('task execution gate cannot imply repository production approval', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const cloud = await read('../../.github/workflows/ai-engineering-command-center.yml');
  for (const workflow of [local, cloud]) {
    assert.match(workflow, /TASK GATE: EVIDENCE_VERIFIED/);
    assert.match(workflow, /system\/Production PROVEN status: NOT_EVALUATED_BY_THIS_TASK_WORKFLOW/);
    assert.doesNotMatch(workflow, /FINAL GATE: PROVEN/);
  }
});

test('autonomous workflows enforce immutable queue and fail-closed scope through a shared verifier', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const cloud = await read('../../.github/workflows/ai-engineering-command-center.yml');
  const guard = await read('./task_scope_guard.py');
  for (const [name, workflow] of [['local', local], ['cloud', cloud]]) {
    assert.ok(
      workflow.includes("task.get('mode') != sys.argv[2]") ||
      workflow.includes("task.get('mode') != mode"),
      name + ': dispatch mode must match the registered task mode'
    );
    assert.match(workflow, /python3 \.ai\/runtime\/task_scope_guard\.py "\$TASK_ID" "\$MODE" "\$BASELINE_SHA"/, name);
  }
  assert.ok(guard.includes('Canonical task queue must remain unchanged during agent execution'));
  assert.ok(guard.includes('Unexpected changed files outside required task paths'));
  assert.ok(guard.includes('PROTECTED_PREFIXES'));
  assert.ok(guard.includes('SECRET_PATH'));
  const gate = await read('../../.github/workflows/ai-architecture-gate.yml');
  assert.match(gate, /python3 \.ai\/runtime\/task_scope_guard_contract_test\.py/);
});


test('local-first workflow checks out the immutable dispatch SHA, never main', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  assert.equal(local.split('ref: ${{ github.sha }}').length - 1, 2);
  assert.equal(local.includes('ref: main'), false);
  assert.ok(local.includes('expected_sha:'));
  assert.equal(local.split('EXPECTED_SHA: ${{ inputs.expected_sha || github.sha }}').length - 1, 3);
  assert.ok(local.includes('expected_sha != event_sha'));
  assert.ok(local.includes('checked_out != expected_sha'));
  assert.ok(local.includes('test "$EXPECTED_SHA" = "$GITHUB_SHA"'));
});


test('agent-authored provider contract is syntax-checked and source-validated, never executed', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const queue = JSON.parse(await read('../tasks/queue.json'));
  const validator = await read('../../scripts/ai/validate-local-provider-contract.mjs');
  const commands = queue.tasks.find(task => task.id === 'AFX-GOLDEN-LOCAL-001').verification.commands;
  assert.ok(commands.some(command => JSON.stringify(command) === JSON.stringify(['node', '--check', '.ai/runtime/local-provider.contract.test.mjs'])));
  assert.ok(commands.some(command => JSON.stringify(command) === JSON.stringify(['node', 'scripts/ai/validate-local-provider-contract.mjs'])));
  assert.ok(local.includes('node --check .ai/runtime/local-provider.contract.test.mjs'));
  assert.ok(local.includes('node scripts/ai/validate-local-provider-contract.mjs'));
  assert.equal(local.includes('node --test .ai/runtime/local-provider.contract.test.mjs'), false);
  assert.ok(validator.includes('const source = await read(sourcePath)'));
  assert.ok(validator.includes('source_executed: false'));
  assert.ok(validator.includes('never import or execute it'));
});

test('local OpenCode runtime has secret-read denies and task-only edit scope', async () => {
  const openCode = JSON.parse(await read('../../opencode.json'));
  const agent = await read('../../.opencode/agents/afaghx-engineer.md');
  assert.ok(openCode.permissions.some(rule => rule.action === 'read' && rule.resource === '*production*' && rule.effect === 'deny'));
  assert.ok(openCode.permissions.some(rule => rule.action === 'read' && rule.resource === '*secrets/*' && rule.effect === 'deny'));
  assert.ok(openCode.permissions.some(rule => rule.action === 'read' && rule.resource === '*credentials*' && rule.effect === 'deny'));
  assert.ok(openCode.permissions.some(rule => rule.action === 'shell' && rule.resource === 'git show *' && rule.effect === 'deny'));
  assert.ok(agent.includes('permissions:'));
  assert.ok(agent.includes('resource: ".ai/runtime/local-provider.contract.test.mjs"'));
  assert.ok(agent.includes('resource: ".ai/policies/*"'));
});

test('local-first workflow fails closed on stale branch candidates before execution and publication', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  assert.equal(local.split('git ls-remote origin').length - 1, 3, 'freshness is checked before approval, after approval, and before publication');
  assert.equal(local.split('remote branch HEAD=').length - 1, 3, 'every freshness check compares the live branch head');
  assert.equal(local.split('STALE_CANDIDATE').length - 1, 6, 'each freshness check fails closed for stale candidates');
  assert.equal(local.split('CURRENT_BRANCH_HEAD_SHA').length - 1, 3, 'each gate records the current branch head');
  assert.ok(local.includes('GITHUB_REF_TYPE'));
  assert.ok(local.includes('GITHUB_REF_NAME'));
});

test('local model process removes provider, SCM, and cloud credential variables', async () => {
  const runner = await read('../../scripts/ai/run-local-agent.sh');
  assert.match(runner, /while IFS= read -r name; do/);
  assert.match(runner, /compgen -e/);
  assert.match(runner, /unset "\$name"/);
  for (const pattern of ['*_API_KEY', '*_TOKEN', '*_SECRET', '*_PASSWORD', '*_CREDENTIALS', 'AWS_*', 'AZURE_*', 'ACTIONS_ID_TOKEN_*']) {
    assert.ok(runner.includes(pattern), `credential filter missing: ${pattern}`);
  }
});

test('runner fallback uses local Ollama, keeps self-hosted routing, and preserves fail-closed gates', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const adr = await read('../architecture/adr/ADR-AI-002-github-hosted-local-ollama-fallback.md');
  assert.match(local, /runner_target:/);
  assert.match(local, /ubuntu-24\.04/);
  assert.match(local, /self-hosted.*linux.*x64.*afaghx-ai/);
  assert.match(local, /curl -fsSL https:\/\/ollama\.com\/install\.sh/);
  assert.match(local, /ollama pull qwen3:14b/);
  assert.match(local, /ollama create afaghx-qwen3:14b-32k/);
  assert.match(local, /PARAMETER num_ctx 32768/);
  assert.match(local, /MODEL_CONTEXT_GATE=PASS/);
  assert.match(local, /afaghx-ai-execute/);
  assert.match(local, /AFX-HOSTED-EXECUTE-ONCE/);
  assert.match(local, /afaghx-ai-hosted-execute/);
  assert.match(local, /github\.event_name == 'push'/);
  assert.match(local, /STALE_CANDIDATE/);
  assert.match(local, /system\/Production PROVEN status: NOT_EVALUATED_BY_THIS_TASK_WORKFLOW/);
  assert.match(adr, /paid model API/);
  assert.match(adr, /fails closed/);
});

test('Qwen3 local runtime proves native and OpenCode tool execution before agent work', async () => {
  const openCode = JSON.parse(await read('../../opencode.json'));
  const commandCenter = await read('../command-center.yaml');
  const preflight = await read('../../scripts/ai/local-agent-preflight.sh');
  const runner = await read('../../scripts/ai/run-local-agent.sh');
  const workflow = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const agent = await read('../../.opencode/agents/afaghx-engineer.md');
  assert.equal(commandCenter.includes('default_model: ollama/afaghx-qwen3:14b-32k'), true);
  assert.equal(openCode.model, 'ollama/afaghx-qwen3:14b-32k');
  assert.equal(openCode.providers.ollama.models['afaghx-qwen3:14b-32k'].capabilities.tools, true);
  assert.equal(openCode.providers.ollama.models['afaghx-qwen3:14b-32k'].limit.context, 32768);
  assert.match(preflight, /OLLAMA_TOOL_CALL_GATE=PASS/);
  assert.match(preflight, /OLLAMA_OPENAI_TOOL_CALL_GATE=PASS/);
  assert.match(preflight, /reasoning_effort.*none/);
  assert.match(workflow, /OPENCODE_CONFIG_CONTENT/);
  assert.match(runner, /export OPENCODE_CONFIG_CONTENT/);
  assert.match(runner, /reasoning_effort/);
  assert.match(workflow, /Verify OpenCode executes a real allowed tool call before engineering/);
  assert.match(workflow, /AFX-OPENCODE-TOOL-DISPATCH-PASS/);
  assert.match(workflow, /MODEL_CONTEXT_GATE=PASS/);
  assert.match(runner, /Never assume a placeholder or use an oldString that is not present/);
  assert.match(agent, /Do not invent placeholder text/);
});

test('Ollama auto-discovery cannot replace pinned provider transport settings or stall native tool dispatch', async () => {
  const openCode = JSON.parse(await read('../../opencode.json'));
  const workflow = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  assert.ok(openCode.plugins.includes('-opencode.provider.ollama'));
  assert.equal(openCode.providers.ollama.settings.timeout, false);
  assert.equal(openCode.providers.ollama.settings.headerTimeout, false);
  assert.equal(openCode.providers.ollama.settings.chunkTimeout, 1200000);
  // Keep explicit, bounded budgets after the observed 600-second transport failure.
  assert.match(workflow, /timeout-minutes:\s*90/);
  assert.match(workflow, /timeout 1800s opencode run/);
  assert.match(workflow, /timeout 3600s bash scripts\/ai\/run-local-agent\.sh/);
  assert.match(workflow, /AFX-OPENCODE-TOOL-DISPATCH-PASS/);
});
test('OpenCode tool-dispatch smoke captures stdout and stderr before validating execution evidence', async () => {
  const workflow = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  assert.match(workflow, /output="\$\(timeout 1800s opencode run[^\n]*2>&1\)" \|\| \{/);
  assert.match(workflow, /GITHUB_WORKSPACE/);
  assert.match(workflow, /AFX-OPENCODE-TOOL-DISPATCH-PASS/);
});
