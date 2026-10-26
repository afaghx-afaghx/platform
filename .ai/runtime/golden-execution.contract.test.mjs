import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('AFX-GOLDEN-001: GPT-5.6 is the canonical direct engineering runtime', async () => {
  const center = await read('../command-center.yaml');
  const providers = await read('../providers.yaml');
  const queue = JSON.parse(await read('../tasks/queue.json'));
  const workflow = await read('../../.github/workflows/ai-engineering-command-center.yml');
  const contract = await read('../contracts/AFX-AI-CEA-001-v2.md');

  assert.match(center, /provider:\s*openai-gpt56/);
  assert.match(center, /default_model:\s*gpt-5\.6-sol/);
  assert.match(center, /paid_provider_required:\s*true/);
  assert.match(center, /direct_push_to_main:\s*false/);
  assert.match(center, /unknown_is_not_green:\s*true/);

  assert.match(providers, /primary_provider:\s*openai-gpt56/);
  assert.match(providers, /model:\s*gpt-5\.6-sol/);
  assert.match(providers, /primary_path_must_depend_on_paid_provider_for_real_golden_execution:\s*true/);
  assert.doesNotMatch(providers, /openai-codex:/);

  const task = queue.tasks.find(item => item.id === 'AFX-GOLDEN-001');
  assert.ok(task);
  assert.equal(task.status, 'READY');
  assert.equal(task.mode, 'golden-execution');
  assert.equal(task.verification.truth_required, 'PROVEN');
  assert.deepEqual(task.required_change_paths, ['.ai/runtime/golden-execution.contract.test.mjs']);

  assert.match(workflow, /secrets\.OPENAI_API_KEY/);
  assert.match(workflow, /model:\s*gpt-5\.6-sol/);
  assert.doesNotMatch(workflow, /inputs\.model/);
  assert.doesNotMatch(workflow, /ref:\s*main/);
  assert.match(workflow, /human review before merge/i);
  assert.match(contract, /GPT-5\.6 is the designated engineering reasoning provider/);
  assert.match(contract, /MERGE_MAIN/);
  assert.match(contract, /SECRET_READ/);
  assert.match(contract, /UNKNOWN is never GREEN/);
});

test('AFX-GOLDEN-001: local provider is contract-test-only fallback', async () => {
  const providers = await read('../providers.yaml');
  assert.match(providers, /local-ollama:/);
  assert.match(providers, /role: contract_test_only/);
  assert.match(providers, /allowed_modes: \[contract-test\]/);
});
