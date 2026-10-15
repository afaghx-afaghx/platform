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
  assert.match(workflow, /ollama pull "\$model"/);
  assert.match(workflow, /runner_target: /);
  assert.doesNotMatch(workflow, /OPENAI_API_KEY|openai-api-key:/);
  assert.match(preflight, /OLLAMA_URL/);
  assert.match(runner, /opencode run/);
  assert.equal(openCode.model, 'ollama/qwen2.5-coder:14b');
  assert.equal(openCode.providers.ollama.settings.baseURL, 'http://127.0.0.1:11434/v1');
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
