import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('AFX-GOLDEN-001: governed Agent control plane is internally consistent', async () => {
  const agent = await read('../agents/afaghx-chief-engineering-agent.md');
  const commandCenter = await read('../command-center.yaml');
  const queue = JSON.parse(await read('../tasks/queue.json'));
  const contract = await read('../contracts/agent-contract.yaml');
  const workflow = await read('../../.github/workflows/ai-engineering-command-center.yml');
  const runtime = await read('../../platform/Gateway/runtime.mjs');

  assert.match(agent, /AFX-AI-CEA-001/);
  assert.match(commandCenter, /unknown_is_not_green:\s*true/);
  assert.match(contract, /implementation_and_approval_must_be_independent:\s*true/);

  const task = queue.tasks.find(item => item.id === 'AFX-GOLDEN-001');
  assert.ok(task);
  assert.equal(task.status, 'READY');
  assert.equal(task.mode, 'golden-execution');
  assert.equal(task.verification.truth_required, 'PROVEN');

  assert.match(workflow, /openai\/codex-action@v1/);
  assert.match(workflow, /permission-profile:\s*":workspace"/);
  assert.match(workflow, /safety-strategy:\s*drop-sudo/);
  assert.match(workflow, /environment:\s*afaghx-ai-execute/);
  assert.match(workflow, /AFX-GOLDEN-EXECUTE/);
  assert.match(runtime, /PersistentAfxCore/);
  assert.match(runtime, /PostgresAfxCoreRepository/);
  assert.match(runtime, /Gateway -> PersistentAfxCore -> PostgreSQL/);

  assert.doesNotMatch(agent, /push,\s*merge,\s*deploy/i);
});
