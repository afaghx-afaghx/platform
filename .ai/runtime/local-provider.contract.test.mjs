import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = async path => readFile(new URL(path, root), 'utf8');

test('AFX-LOCAL-001: local validation is free and cannot claim PROVEN', async () => {
  const center = await read('command-center.yaml');
  const providers = await read('providers.yaml');
  const queue = JSON.parse(await read('tasks/queue.json'));

  assert.match(center, /local_validation:/);
  assert.match(center, /paid_api_required:\s*false/);
  assert.match(center, /truth_state_ceiling:\s*TESTED/);
  assert.match(center, /cannot_claim: \[PROVEN, PRODUCTION_READY\]/);

  assert.match(providers, /local-ollama:/);
  assert.match(providers, /role: contract_test_only/);
  assert.doesNotMatch(providers, /secret_ref:\s*OPENAI_API_KEY/);

  const task = queue.tasks.find(item => item.id === 'AFX-LOCAL-001');
  assert.ok(task);
  assert.equal(task.status, 'READY');
  assert.equal(task.mode, 'local-validation');
  assert.equal(task.verification.truth_required, 'TESTED');
  assert.deepEqual(task.required_change_paths, ['.ai/runtime/local-provider.contract.test.mjs']);
});

test('AFX-LOCAL-001: canonical architecture and provider separation remain explicit', async () => {
  const center = await read('command-center.yaml');
  const providers = await read('providers.yaml');
  assert.match(center, /AFX-CORE/);
  assert.match(center, /EXPERIENCE/);
  assert.match(center, /local-ollama/);
  assert.match(center, /unknown_is_not_green:\s*true/);
  assert.match(providers, /primary_provider:\s*openai-gpt56/);
  assert.match(providers, /primary_path_must_depend_on_paid_provider_for_real_golden_execution:\s*true/);
});

test('AFX-LOCAL-001: local path does not contain an OpenAI execution interface', async () => {
  const workflow = await read('../.github/workflows/ai-engineering-local.yml');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /AFX-LOCAL-001/);
  assert.doesNotMatch(workflow, /OPENAI_API_KEY/);
  assert.doesNotMatch(workflow, /codex-action/);
  assert.doesNotMatch(workflow, /gpt-5\.6-sol/);
});
