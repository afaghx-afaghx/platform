import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  'AGENTS.md',
  '.ai/command-center.yaml',
  '.ai/policies/engineering.md',
  '.ai/architecture/system-map.yaml',
  '.ai/architecture/module-map.yaml',
  '.ai/contracts/module-contract.yaml',
  '.ai/contracts/agent-contract.yaml',
  '.ai/evidence/evidence-schema.yaml',
  '.ai/providers.yaml',
  '.github/workflows/ai-engineering-command-center.yml',
];

test('AIECC required control-plane files exist', () => {
  for (const file of requiredFiles) assert.equal(exists(file), true, file);
});

test('AIECC policy is fail-closed and evidence-first', () => {
  const policy = read('.ai/policies/engineering.md');
  for (const phrase of [
    'UNKNOWN means the check was not executed or evidence is unavailable',
    'The agent must never convert UNKNOWN to GREEN',
    'Require human review before merge',
  ]) assert.match(policy, new RegExp(phrase.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')));
});

test('AIECC configuration forbids direct main writes and requires PR review', () => {
  const config = read('.ai/command-center.yaml');
  assert.match(config, /direct_push_to_main:\s*false/);
  assert.match(config, /pull_request_only/);
  assert.match(config, /human_review_before_merge/);
  assert.match(config, /secret_changes:\s*denied/);
  assert.match(config, /architecture_changes:\s*adr_required/);
});

test('AIECC workflow has isolated execution and evidence controls', () => {
  const workflow = read('.github/workflows/ai-engineering-command-center.yml');
  assert.match(workflow, /environment:\s*afaghx-ai-execute/);
  assert.match(workflow, /permission-profile:\s*':workspace'/);
  assert.match(workflow, /safety-strategy:\s*drop-sudo/);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /Create PR branch/);
  assert.match(workflow, /Upload evidence/);
  assert.doesNotMatch(workflow, /push\s+origin\s+main/);
  assert.doesNotMatch(workflow, /pull_request_target:/);
});

test('GitHub Actions used by AIECC are immutable SHA references', () => {
  const workflow = read('.github/workflows/ai-engineering-command-center.yml');
  const actionRefs = [...workflow.matchAll(/uses:\s*([^\s#]+)/g)].map((m) => m[1]);
  assert.ok(actionRefs.length > 0);
  for (const ref of actionRefs) {
    assert.match(ref, /@[0-9a-f]{40}$/i, `un-pinned action: ${ref}`);
  }
});

test('Evidence schema requires provenance and treats missing evidence as UNKNOWN', () => {
  const schema = read('.ai/evidence/evidence-schema.yaml');
  assert.match(schema, /green_rule:/);
  assert.match(schema, /unknown_rule:/);
  assert.match(schema, /command/);
  assert.match(schema, /exit_code/);
  assert.match(schema, /workflow_run/);
  assert.match(schema, /artifact_or_log_reference/);
});
