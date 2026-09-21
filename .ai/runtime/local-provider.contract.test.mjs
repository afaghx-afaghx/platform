import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('AFX-GOLDEN-LOCAL-001: local Ollama is the primary execution path', async () => {
  const cc = await read('../command-center.yaml');
  const providers = await read('../providers.yaml');
  const contract = await read('../providers/provider-contract.yaml');
  const workflow = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const runner = await read('../../scripts/ai/run-local-agent.sh');
  const preflight = await read('../../scripts/ai/local-agent-preflight.sh');
  const openCode = JSON.parse(await read('../../opencode.json'));

  assert.match(cc, /provider:\s*local-ollama/);
  assert.match(cc, /paid_provider_required:\s*false/);
  assert.match(providers, /primary_provider:\s*local-ollama/);
  assert.match(providers, /primary_path_must_not_depend_on_paid_credits:\s*true/);
  assert.match(contract, /fallback_must_preserve_policy:\s*true/);
  assert.match(workflow, /runs-on:\s*\[self-hosted, linux, x64, afaghx-ai\]/);
  assert.match(workflow, /Create isolated work branch BEFORE model execution/);
  assert.match(workflow, /git switch -c/);
  assert.match(workflow, /Run Local Provider contract/);
  assert.match(workflow, /Run Golden Execution governance contract/);
  assert.match(workflow, /Run deterministic Task\/Gate\/Evidence loop/);
  assert.match(workflow, /Create governed pull request/);
  assert.match(runner, /opencode run --standalone --model "ollama\/\${MODEL}"/);
  assert.match(runner, /Never push, merge, deploy, or create a pull request yourself/);
  assert.match(preflight, /ollama list/);
  assert.match(preflight, /curl --fail.*\/api\/tags/);
  assert.equal(openCode.model, 'ollama/qwen2.5-coder:14b');
  assert.equal(openCode.providers.ollama.settings.baseURL, 'http://127.0.0.1:11434/v1');
});
