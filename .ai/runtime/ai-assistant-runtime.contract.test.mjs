import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('every queued verification command is explicitly allowlisted by the task runner', async () => {
  const queue = JSON.parse(await read('../tasks/queue.json'));
  const source = await read('./agent-loop.py');
  const allowlist = source.match(/ALLOWED\\s*=\\s*\\{([\\s\\S]*?)\\n\\}/)?.[1];
  assert.ok(allowlist, 'the command allowlist must remain explicit');
  for (const task of queue.tasks) {
    for (const command of task.verification?.commands ?? []) {
      const tuple = `(${command.map(value => "'" + value.replaceAll("'", "\\\\\\\\'") + "'").join(',')})`;
      assert.ok(allowlist.includes(tuple), `queued command is not allowlisted: ${JSON.stringify(command)}`);
    }
  }
});

test('runtime evidence directories are created even on a fresh checkout', async () => {
  const loop = await read('./agent-loop.py');
  const forensics = await read('./forensics.py');
  assert.match(loop, /OUT\\.mkdir\\(parents=True, exist_ok=True\\)/);
  assert.match(forensics, /OUT\\.mkdir\\(parents=True, exist_ok=True\\)/);
});

test('task execution can never self-promote to PROVEN or mutate the canonical queue', async () => {
  const loop = await read('./agent-loop.py');
  assert.match(loop, /'truth_state':'TESTED' if success else 'UNKNOWN'/);
  assert.match(loop, /'system_production_gate':'NOT_EVALUATED_BY_THIS_TASK_WORKFLOW'/);
  assert.doesNotMatch(loop, /'truth_state'\\s*:\\s*'PROVEN'/);
  assert.doesNotMatch(loop, /QUEUE\\.write_text/);
});

test('local and cloud workflows capture newly-created files in their change manifest', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const cloud = await read('../../.github/workflows/ai-engineering-command-center.yml');
  for (const [name, workflow] of [['local', local], ['cloud', cloud]]) {
    assert.match(workflow, /git ls-files --others --exclude-standard/, `${name} workflow must include untracked files`);
    assert.match(workflow, /git add -N -- "\\$\\{untracked\\[@\\]\\}"/, `${name} workflow must intent-to-add untracked files before diff checks`);
  }
});

test('dispatch values are passed through environment variables, not interpolated into shell statements', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const cloud = await read('../../.github/workflows/ai-engineering-command-center.yml');
  for (const [name, workflow] of [['local', local], ['cloud', cloud]]) {
    assert.doesNotMatch(workflow, /printf[^\\n]*\\$\\{\\{\\s*inputs\\.(?:task|mode|model)/, `${name} workflow must not interpolate dispatch input in shell printf`);
    assert.match(workflow, /TASK_ID:\\s*\\$\\{\\{\\s*inputs\\.task/, `${name} workflow must pass task id using env`);
    assert.match(workflow, /TRIGGER_EVENT:\\s*\\$\\{\\{\\s*github\\.event_name\\s*\\}\\}/);
  }
  assert.match(local, /Validate local model selector/);
  assert.match(local, /ollama\\/\\[A-Za-z0-9\\]/);
});

test('task execution gate cannot imply repository production approval', async () => {
  const local = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const cloud = await read('../../.github/workflows/ai-engineering-command-center.yml');
  for (const workflow of [local, cloud]) {
    assert.match(workflow, /TASK GATE: EVIDENCE_VERIFIED/);
    assert.match(workflow, /system\\/Production PROVEN status: NOT_EVALUATED_BY_THIS_TASK_WORKFLOW/);
    assert.doesNotMatch(workflow, /FINAL GATE: PROVEN/);
  }
});
