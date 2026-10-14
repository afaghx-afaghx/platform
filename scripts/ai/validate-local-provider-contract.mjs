import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const sourcePath = '.ai/runtime/local-provider.contract.test.mjs';
const source = await read(sourcePath);
const providers = await read('.ai/providers.yaml');
const commandCenter = await read('.ai/command-center.yaml');
const agent = await read('.ai/agents/afaghx-chief-engineering-agent.md');
const openCode = JSON.parse(await read('opencode.json'));

// The AI-authored test is untrusted input. Inspect its source; never import or execute it here.
const imports = [...source.matchAll(/^\s*import\s+[^'\"\n]+\s+from\s+['\"]([^'\"]+)['\"]\s*;?\s*$/gm)].map(([, name]) => name).sort();
assert.deepEqual(imports, ['node:assert/strict', 'node:fs/promises', 'node:test'].sort(), 'Only test/assert/read-only file imports are permitted');
assert.doesNotMatch(source, /\b(?:child_process|execSync|spawnSync|execFileSync|execFile|spawn|eval|Function|WebSocket|XMLHttpRequest)\b|\bprocess\s*\.|\bfetch\s*\(|\bimport\s*\(|\brequire\s*\(|\bcreateServer\s*\(|\b(?:writeFile|appendFile|unlink|rmSync)\s*\(/, 'Candidate test contains a prohibited execution, environment, network, or write primitive');
assert.doesNotMatch(source, /node:(?:child_process|http|https|net|tls|dgram|worker_threads|vm|cluster|dns|os|module)/, 'Candidate test imports a privileged Node built-in');

// Verify the requested assertions are present in the unexecuted test source.
for (const pattern of [
  /node:test/,
  /node:assert\/strict/,
  /node:fs\/promises/,
  /ollama\/qwen2\.5-coder:14b/,
  /http:\/\/127\.0\.0\.1:11434\/v1/,
  /primary_provider:\s*local-ollama/,
  /paid_provider_required:\s*false/,
  /primary_path_must_not_depend_on_paid_credits:\s*true/,
  /unknown_is_not_green:\s*true/,
  /providers\.yaml/,
  /command-center\.yaml/,
  /opencode\.json/,
  /\.opencode\/agents\/afaghx-engineer\.md/,
]) {
  assert.match(source, pattern, `Required contract assertion missing: ${pattern}`);
}

// Verify actual checked-in runtime configuration, rather than trusting source assertions alone.
assert.match(providers, /primary_provider:\s*local-ollama/);
assert.match(providers, /paid_provider_required:\s*false/);
assert.match(providers, /primary_path_must_not_depend_on_paid_credits:\s*true/);
assert.match(commandCenter, /provider:\s*local-ollama/);
assert.match(commandCenter, /paid_provider_required:\s*false/);
assert.match(commandCenter, /unknown_is_not_green:\s*true/);
assert.equal(openCode.model, 'ollama/qwen2.5-coder:14b');
assert.equal(openCode.providers?.ollama?.settings?.baseURL, 'http://127.0.0.1:11434/v1');
assert.ok(openCode.permissions.some(rule => rule.action === 'shell' && rule.resource === '*' && rule.effect === 'deny'));
assert.ok(openCode.permissions.some(rule => rule.action === 'read' && rule.resource === '*production*' && rule.effect === 'deny'));
assert.ok(openCode.permissions.some(rule => rule.action === 'shell' && rule.resource === 'git show *' && rule.effect === 'deny'));
assert.match(agent, /AFX-AI-CEA-001/);

console.log(JSON.stringify({
  status: 'PASS',
  truth_state: 'TESTED',
  source_file: sourcePath,
  source_executed: false,
  provider: 'local-ollama',
  model: openCode.model,
  paid_provider_required: false,
  production_readiness: 'NOT_PROVEN',
  unknown_is_not_green: true,
}, null, 2));
