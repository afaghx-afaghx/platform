import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('AFX-GOLDEN-LOCAL-001: Local-First Agent control plane is internally consistent', async () => {
  const agent = await read('../agents/afaghx-chief-engineering-agent.md');
  const commandCenter = await read('../command-center.yaml');
  const queue = JSON.parse(await read('../tasks/queue.json'));
  const contract = await read('../contracts/agent-contract.yaml');
  const providers = await read('../providers.yaml');
  const providerContract = await read('../providers/provider-contract.yaml');
  const workflow = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const openCode = JSON.parse(await read('../../opencode.json'));
  const runtime = await read('../../platform/Gateway/runtime.mjs');
  const loop = await read('./agent-loop.py');
  const localWorkflow = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const cloudWorkflow = await read('../../.github/workflows/ai-engineering-command-center.yml');

  assert.match(agent, /AFX-AI-CEA-001/);
  assert.match(commandCenter, /provider:\s*local-ollama/);
  assert.match(commandCenter, /paid_provider_required:\s*false/);
  assert.match(commandCenter, /unknown_is_not_green:\s*true/);
  assert.match(contract, /implementation_and_approval_must_be_independent:\s*true/);
  assert.match(providers, /primary_provider:\s*local-ollama/);
  assert.match(providers, /paid_provider_required:\s*false/);
  assert.match(providers, /primary_path_must_not_depend_on_paid_credits:\s*true/);
  assert.match(providerContract, /fallback_must_preserve_policy:\s*true/);

  const task = queue.tasks.find(item => item.id === 'AFX-GOLDEN-LOCAL-001');
  assert.ok(task);
  assert.equal(task.status, 'READY');
  assert.equal(task.mode, 'golden-execution');
  assert.equal(task.verification.truth_required, 'TESTED');
  assert.deepEqual(task.required_change_paths, ['.ai/runtime/local-provider.contract.test.mjs']);

  assert.match(workflow, /runs-on:\s*\[self-hosted, linux, x64, afaghx-ai\]/);
  assert.match(workflow, /environment:\s*afaghx-ai-execute/);
  assert.match(workflow, /scripts\/ai\/run-local-agent\.sh/);
  assert.match(workflow, /opencode run/);
  assert.match(workflow, /ollama\/qwen2\.5-coder:14b/);
  assert.doesNotMatch(workflow, /on:\s*\n\s*push:/);
  assert.equal(openCode.model, 'ollama/qwen2.5-coder:14b');
  assert.equal(openCode.providers.ollama.settings.baseURL, 'http://127.0.0.1:11434/v1');

  assert.match(runtime, /PersistentAfxCore/);
  assert.match(runtime, /PostgresAfxCoreRepository/);
  assert.match(runtime, /Gateway -> PersistentAfxCore -> PostgreSQL/);
  assert.doesNotMatch(agent, /push,\s*merge,\s*deploy/i);

  const allowedBlock = loop.match(/ALLOWED=\{([\s\S]*?)\n\}/)?.[1] ?? '';
  const allowedCommands = [...allowedBlock.matchAll(/\(([^()]*)\)/g)].map(([, tuple]) =>
    [...tuple.matchAll(/'([^']*)'/g)].map(([, value]) => value)
  );
  for (const command of task.verification.commands) {
    assert.ok(allowedCommands.some(allowed => JSON.stringify(allowed) === JSON.stringify(command)),
      `agent-loop.py must allow queue verification command: ${command.join(' ')}`);
  }

  assert.match(loop, /'truth_state':'TESTED' if success else 'IMPLEMENTED'/);
  assert.doesNotMatch(loop, /'truth_state':'PROVEN'/);
  for (const workflow of [localWorkflow, cloudWorkflow]) {
    assert.match(workflow, /AFX-AI-CEA-001 CANDIDATE GATE: TESTED; PROVEN=NOT_CLAIMED; PRODUCTION_READY=NOT_CLAIMED/);
    assert.doesNotMatch(workflow, /FINAL GATE: PROVEN/);
  }
  assert.match(cloudWorkflow, /default: AFX-GOLDEN-LOCAL-001/);
  assert.match(localWorkflow, /task\.get\('mode'\) != sys\.argv\[2\]/);
  assert.match(cloudWorkflow, /task\.get\('mode'\) != mode/);
  assert.doesNotMatch(cloudWorkflow, /For AFX-GOLDEN-001, the required substantive change is:/);
});
