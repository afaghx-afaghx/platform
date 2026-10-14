import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = async path => readFile(new URL(path, root), 'utf8');

test('the governed task verification commands are allowlisted', async () => {
  const loop = await read('.ai/runtime/agent-loop.py');
  const queue = JSON.parse(await read('.ai/tasks/queue.json'));
  const task = queue.tasks.find(item => item.id === 'AFX-GOLDEN-LOCAL-001');
  assert.ok(task, 'local golden task must be registered');
  const commands = task.verification.commands.map(parts => parts.join(' '));
  for (const command of commands) {
    const normalized = command.replaceAll(' ', '');
    const allowed = [
      "('node','--test','.ai/runtime/local-provider.contract.test.mjs')",
      "('node','--test','.ai/runtime/golden-execution.contract.test.mjs')",
      "('node','--test','platform/Gateway/runtime.integration.test.mjs')",
      "('npm','--prefix','core/AFX-CORE','run','test:security')"
    ].some(fragment => loop.includes(fragment) && normalized.length > 0);
    assert.ok(allowed && loop.includes('if tuple(command) not in ALLOWED'), `verification command must be explicitly allowlisted: ${command}`);
  }
});

test('automated task checks cannot self-certify PROVEN or production readiness', async () => {
  const loop = await read('.ai/runtime/agent-loop.py');
  const queue = JSON.parse(await read('.ai/tasks/queue.json'));
  const task = queue.tasks.find(item => item.id === 'AFX-GOLDEN-LOCAL-001');
  assert.equal(task.verification.truth_required, 'TESTED');
  assert.match(loop, /'truth_state':'TESTED' if success else 'UNKNOWN'/);
  assert.match(loop, /'evidence_state':'GREEN' if success else 'RED'/);
  assert.match(loop, /'reviewer_independence':\{'status':'PENDING','satisfied':False\}/);
  assert.match(loop, /'pull_request':\{'status':'PENDING'\}/);
  assert.doesNotMatch(loop, /'truth_state'\s*:\s*'PROVEN'/);
});

test('both execution workflows report TESTED, never a release Final Gate', async () => {
  for (const path of [
    '.github/workflows/ai-engineering-command-center.yml',
    '.github/workflows/ai-engineering-command-center-local.yml'
  ]) {
    const workflow = await read(path);
    assert.match(workflow, /EXECUTION GATE: TESTED/);
    assert.match(workflow, /PRODUCTION_READY remain UNVERIFIED/);
    assert.doesNotMatch(workflow, /FINAL GATE: PROVEN/);
    assert.match(workflow, /Requested mode does not match governed task mode/);
  }
});

test('workflow_dispatch model and task values are passed through environment variables', async () => {
  for (const path of [
    '.github/workflows/ai-engineering-command-center.yml',
    '.github/workflows/ai-engineering-command-center-local.yml'
  ]) {
    const workflow = await read(path);
    const line = workflow.split(/\r?\n/).find(entry => entry.includes('agent-evidence/run-context.txt'));
    assert.ok(line, `run context must be recorded in ${path}`);
    assert.match(line, /"\$TASK_ID"/);
    assert.match(line, /"\$AFAGHX_AGENT_MODE"/);
    assert.match(line, /"\$MODEL_CONTEXT"/);
    assert.doesNotMatch(line, /\$\{\{\s*inputs\./);
  }
});

test('changed-path shell guards use a real newline format and cannot collapse the file list', async () => {
  const singleSlashFormat = "printf '%s" + String.fromCharCode(92) + "n'";
  const doubleSlashFormat = "printf '%s" + String.fromCharCode(92, 92) + "n'";
  for (const path of [
    '.github/workflows/ai-engineering-command-center.yml',
    '.github/workflows/ai-engineering-command-center-local.yml'
  ]) {
    const workflow = await read(path);
    const guards = workflow.split(/\r?\n/).filter(line => line.includes('if printf') && line.includes('grep -Eq'));
    assert.equal(guards.length, 2);
    for (const guard of guards) {
      assert.ok(guard.includes(singleSlashFormat), `path guard must delimit each changed file in ${path}`);
      assert.ok(!guard.includes(doubleSlashFormat), `path guard must not emit literal \\n in ${path}`);
    }
  }
});

test('the local-first provider route remains independent of paid API credentials', async () => {
  const registry = await read('.ai/providers.yaml');
  const localWorkflow = await read('.github/workflows/ai-engineering-command-center-local.yml');
  assert.match(registry, /primary_provider:\s*local-ollama/);
  assert.match(registry, /primary_path_must_not_depend_on_paid_credits:\s*true/);
  assert.doesNotMatch(localWorkflow, /OPENAI_API_KEY/);
  assert.match(localWorkflow, /runs-on:\s*\[self-hosted, linux, x64, afaghx-ai\]/);
});
