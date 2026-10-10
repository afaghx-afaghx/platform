import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('AFAGHX CEA control plane is evidence-first and main-protected', () => {
  const center = read('.ai/command-center.yaml');
  const policy = read('.ai/policies/engineering.md');
  const workflow = read('.ai/workflows/engineering-loop.yaml');

  assert.match(center, /direct_push_to_main:\s*false/);
  assert.match(center, /unknown_is_not_green:\s*true/);
  assert.match(center, /human_review_before_merge/);
  assert.match(policy, /Read `AGENTS\.md` first/);
  assert.match(policy, /human review before merge/);
  assert.match(workflow, /evidence_audit/);
  assert.match(workflow, /human_review/);
});

test('GPT-5.6 is the designated direct engineering provider', () => {
  const providers = read('.ai/providers.yaml');
  assert.match(providers, /gpt-5\.6-sol/);
  assert.match(providers, /primary_provider:\s*openai-gpt56/);
  assert.match(providers, /provider_credentials_never_stored_in_repo:\s*true/);
});

test('governance documents prohibit self-approval and secret access', () => {
  const contract = read('.ai/contracts/AFX-AI-CEA-001-v2.md');
  assert.match(contract, /MERGE_MAIN/);
  assert.match(contract, /PRODUCTION_DEPLOY/);
  assert.match(contract, /SECRET_READ/);
  assert.match(contract, /FABRICATED_GREEN/);
  assert.match(contract, /UNKNOWN is never GREEN/);
});
