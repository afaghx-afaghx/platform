import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('local provider is the primary execution path and does not require paid credentials', async () => {
  const providers = await read('../providers.yaml');
  const commandCenter = await read('../command-center.yaml');
  const workflow = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const preflight = await read('../../scripts/ai/local-agent-preflight.sh');
  const runner = await read('../../scripts/ai/run-local-agent.sh');
  const openCode = JSON.parse(await read('../../opencode.json'));

  assert.match(providers, /primary_provider: local-ollama/);
  assert.match(providers, /paid_provider_required: false/);
  assert.match(providers, /primary_path_must_not_depend_on_paid_credits: true/);
  assert.match(commandCenter, /provider: local-ollama/);
  assert.match(commandCenter, /paid_provider_required: false/);
  assert.match(workflow, /Validate local model selector/);
  assert.match(workflow, /ollama\/[A-Za-z0-9]/);
  assert.match(workflow, /Bootstrap ephemeral local Ollama runtime \(GitHub-hosted only\)/);
  assert.match(workflow, /curl -fsSL https:\/\/ollama\.com\/install\.sh/);
  assert.match(workflow, /ollama pull qwen3:14b/);
  assert.match(workflow, /ollama create afaghx-qwen3:14b-32k/);
  assert.match(workflow, /PARAMETER num_ctx 32768/);
  assert.match(workflow, /MODEL_CONTEXT_GATE=PASS/);
  assert.match(workflow, /runner_target:\s*\n\s*description:/);
  assert.doesNotMatch(workflow, /OPENAI_API_KEY|openai-api-key:/);
  assert.match(preflight, /OLLAMA_URL/);
  assert.match(runner, /opencode run/);
  assert.match(preflight, /\/v1\/chat\/completions/);
  assert.match(preflight, /reasoning_effort.*none/);
  assert.match(preflight, /OLLAMA_OPENAI_TOOL_CALL_GATE=PASS/);
  assert.match(workflow, /OPENCODE_CONFIG_CONTENT/);
  assert.match(workflow, /reasoning_effort/);
  assert.match(runner, /export OPENCODE_CONFIG_CONTENT/);
  assert.match(runner, /reasoning_effort/);
  assert.equal(openCode.model, 'ollama/afaghx-qwen3:14b-32k');
  const modelConfig = openCode.providers.ollama.models['afaghx-qwen3:14b-32k'];
  assert.equal(modelConfig.capabilities.tools, true);
  assert.equal(modelConfig.limit.context, 32768);
  assert.equal(modelConfig.limit.output, 8192);
  assert.match(workflow, /OLLAMA_TOOL_CALL_GATE=PASS/);
  assert.match(workflow, /AFX-OPENCODE-TOOL-DISPATCH-PASS/);
  // OpenCode emits tool telemetry on stderr; it must be captured with stdout before checking proof.
  assert.match(workflow, /output="\$\(timeout 1800s opencode run[^\n]*2>&1\)" \|\| \{/);
  // The proven failure was process timeout at 600s after Ollama itself passed.
  // Keep a bounded but realistic local-model smoke budget and a separate task budget.
  assert.match(workflow, /timeout-minutes:\s*90/);
  assert.match(workflow, /timeout 1800s opencode run/);
  assert.match(workflow, /timeout 3600s bash scripts\/ai\/run-local-agent\.sh/);
  assert.equal(openCode.providers.ollama.settings.baseURL, 'http://127.0.0.1:11434/v1');
  assert.ok(openCode.plugins.includes('-opencode.provider.ollama'));
  assert.equal(openCode.providers.ollama.settings.timeout, false);
  assert.equal(openCode.providers.ollama.settings.headerTimeout, false);
  assert.equal(openCode.providers.ollama.settings.chunkTimeout, 1200000);

});

test('provider-local verification is explicitly queued and only requires TESTED evidence', async () => {
  const queue = JSON.parse(await read('../tasks/queue.json'));
  const task = queue.tasks.find(item => item.id === 'AFX-GOLDEN-LOCAL-001');
  assert.ok(task);
  assert.equal(task.status, 'READY');
  assert.equal(task.truth_required, 'TESTED');
  assert.equal(task.verification.truth_required, 'TESTED');
  assert.ok(task.verification.commands.some(command =>
    JSON.stringify(command) === JSON.stringify(['node', '--test', '.ai/runtime/local-provider.contract.test.mjs'])
  ));
  assert.deepEqual(task.required_change_paths, ['.ai/runtime/local-provider.contract.test.mjs']);
});

test('Qwen3 local tool-calling capability is explicitly pinned', async () => {
  const providers = await read('../providers.yaml');
  const commandCenter = await read('../command-center.yaml');
  const agent = await read('../../.opencode/agents/afaghx-engineer.md');
  const openCode = JSON.parse(await read('../../opencode.json'));
  const workflow = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const preflight = await read('../../scripts/ai/local-agent-preflight.sh');
  const modelConfig = openCode.providers.ollama.models['afaghx-qwen3:14b-32k'];

  assert.match(providers, /primary_provider: local-ollama/);
  assert.match(providers, /paid_provider_required: false/);
  assert.match(providers, /primary_path_must_not_depend_on_paid_credits: true/);
  assert.match(commandCenter, /unknown_is_not_green: true/);
  assert.match(agent, /AFX-AI-CEA-001/);
  assert.equal(openCode.model, 'ollama/afaghx-qwen3:14b-32k');
  assert.equal(modelConfig.capabilities.tools, true);
  assert.equal(modelConfig.limit.context, 32768);
  assert.match(preflight, /OLLAMA_TOOL_CALL_GATE=PASS/);
  assert.match(preflight, /OLLAMA_OPENAI_TOOL_CALL_GATE=PASS/);
  assert.match(workflow, /MODEL_CONTEXT_GATE=PASS/);
  assert.match(workflow, /Verify OpenCode executes a real allowed tool call before engineering/);
  assert.match(workflow, /AFX-OPENCODE-TOOL-DISPATCH-PASS/);
  assert.match(workflow, /OPENCODE_CONFIG_CONTENT/);
});
