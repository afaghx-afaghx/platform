import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('AFX-GOLDEN-LOCAL-001: provider, task, and runtime contracts are internally consistent', async () => {
  const agent = await read('../agents/afaghx-chief-engineering-agent.md');
  const commandCenter = await read('../command-center.yaml');
  const queue = JSON.parse(await read('../tasks/queue.json'));
  const contract = await read('../contracts/agent-contract.yaml');
  const providers = await read('../providers.yaml');
  const providerContract = await read('../providers/provider-contract.yaml');
  const workflow = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const openCode = JSON.parse(await read('../../opencode.json'));
  const runtime = await read('../../platform/Gateway/runtime.mjs');
  const agentLoop = await read('./agent-loop.py');

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
  assert.equal(task.status, 'READY', 'a verification run must not mutate the canonical task queue');
  assert.equal(task.mode, 'golden-execution');
  assert.equal(task.verification.truth_required, 'TESTED');
  assert.equal(task.verification.candidate_gate_required, true);
  assert.deepEqual(task.required_change_paths, ['.ai/runtime/local-provider.contract.test.mjs']);

  const allowlist = agentLoop.match(/ALLOWED\s*=\s*\{([\s\S]*?)\n\}/);
  assert.ok(allowlist, 'task runner must expose an exact command allowlist');
  const allowedCommands = [...allowlist[1].matchAll(/\(([^()\n]+)\)/g)]
    .map(([, tuple]) => [...tuple.matchAll(/"([^"]*)"/g)].map(([, value]) => value));
  for (const command of task.verification.commands) {
    assert.ok(
      allowedCommands.some(candidate => JSON.stringify(candidate) === JSON.stringify(command)),
      `Task command is missing from the runtime allowlist: ${JSON.stringify(command)}`
    );
  }
  assert.doesNotMatch(agentLoop, /'truth_state':\s*'PROVEN'\s+if\s+success/);
  assert.doesNotMatch(agentLoop, /QUEUE\.write_text/);
  assert.match(agentLoop, /required_DATABASE_URL_missing_for_runtime_integration_test/);
  assert.match(agentLoop, /"verification_state": verification_state/);
  assert.match(agentLoop, /"truth_state": truth_state/);

  assert.match(workflow, /runs-on:\s*\[self-hosted, linux, x64, afaghx-ai\]/);
  assert.match(workflow, /environment:\s*afaghx-ai-execute/);
  assert.match(workflow, /scripts\/ai\/run-local-agent\.sh/);
  assert.match(workflow, /MODE:\s*\$\{\{ inputs\.mode \}\}/);
  const runner = await read('../../scripts/ai/run-local-agent.sh');
  assert.match(runner, /MODE="\$\{MODE:-golden-execution\}"/);
  assert.match(runner, /MODE: \$\{MODE\}/);
  assert.match(runner, /opencode run/);
  assert.match(workflow, /ollama\/qwen2\.5-coder:14b/);
  assert.match(workflow, /options:\s*\[golden-execution\]/);
  assert.match(workflow, /test -f scripts\/ai\/include-untracked-in-diff\.sh/);
  assert.doesNotMatch(workflow, /on:\s*\n\s*push:/);
  assert.equal(openCode.model, 'ollama/qwen2.5-coder:14b');
  assert.equal(openCode.providers.ollama.settings.baseURL, 'http://127.0.0.1:11434/v1');

  assert.match(runtime, /PersistentAfxCore/);
  assert.match(runtime, /PostgresAfxCoreRepository/);
  assert.match(runtime, /Gateway -> PersistentAfxCore -> PostgreSQL/);
  assert.doesNotMatch(agent, /push,\s*merge,\s*deploy/i);
});

test('AFX-AI-SECURITY-001: OpenCode v2 policies are explicit and deny shell-by-default', async () => {
  const config = JSON.parse(await read('../../opencode.json'));
  const agent = await read('../../.opencode/agents/afaghx-engineer.md');
  assert.ok(Array.isArray(config.permissions), 'OpenCode v2 uses ordered permissions rules');
  assert.ok(config.permissions.some(rule => rule.action === 'shell' && rule.resource === '*' && rule.effect === 'deny'));
  assert.ok(config.permissions.some(rule => rule.action === 'shell' && rule.resource === 'node --test .ai/runtime/local-provider.contract.test.mjs' && rule.effect === 'allow'));
  assert.ok(config.permissions.some(rule => rule.action === 'shell' && rule.resource === 'python3 .ai/runtime/forensics.py' && rule.effect === 'allow'));
  assert.equal(config.permissions.some(rule => rule.action === 'shell' && ['node *', 'node --test *', 'python3 *', 'npm *', 'git diff *'].includes(rule.resource) && rule.effect === 'allow'), false);
  assert.ok(config.permissions.some(rule => rule.action === 'shell' && rule.resource === 'git diff --check' && rule.effect === 'allow'));
  assert.ok(config.permissions.some(rule => rule.action === 'read' && rule.resource === '*.env' && rule.effect === 'deny'));
  const productionReadDenyPatterns = ["*production*","*Production*","*PRODUCTION*","*prod/*","*Prod/*","*PROD/*","prod.*","Prod.*","PROD.*","*.prod.*","*.Prod.*","*.PROD.*","*live-config*","*Live-Config*","*LIVE-CONFIG*","*live_config*","*Live_Config*","*LIVE_CONFIG*","*deploy-config*","*Deploy-Config*","*DEPLOY-CONFIG*","*deploy_config*","*Deploy_Config*","*DEPLOY_CONFIG*"];
  for (const pattern of productionReadDenyPatterns) {
    assert.ok(
      config.permissions.some(rule => rule.action === 'read' && rule.resource === pattern && rule.effect === 'deny'),
      `global OpenCode read policy must deny production-marked path pattern: ${pattern}`
    );
    assert.ok(
      agent.includes(`  - action: read\\n    resource: "${pattern}"\\n    effect: deny\\n`.replaceAll('\\\\n', '\\n')),
      `engineer agent read policy must deny production-marked path pattern: ${pattern}`
    );
  }
  assert.ok(config.permissions.some(rule => rule.action === 'edit' && rule.resource === 'AGENTS.md' && rule.effect === 'deny'));
  assert.match(agent, /^permissions:\s*$/m);
  assert.match(agent, /action:\s*shell/);
  assert.match(agent, /resource:\s*"?AGENTS\.md"?/);
  assert.match(agent, /resource:\s*"?\.ai\/policies\/\*"?/);
  assert.doesNotMatch(agent, /^permission:\s*$/m);
  assert.doesNotMatch(agent, /^\s+bash:\s*$/m);
});

test('AFX-AI-EVIDENCE-001: untracked agent files are included in scope, patch, and secret evidence', async () => {
  const helper = await read('../../scripts/ai/include-untracked-in-diff.sh');
  const localWorkflow = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const cloudWorkflow = await read('../../.github/workflows/ai-engineering-command-center.yml');
  assert.match(helper, /git ls-files --others --exclude-standard -z/);
  assert.match(helper, /git add -N/);
  for (const [name, workflow] of [['local', localWorkflow], ['cloud', cloudWorkflow]]) {
    assert.ok(
      (workflow.match(/bash scripts\/ai\/include-untracked-in-diff\.sh/g) || []).length >= 3,
      `${name} workflow must include untracked files before scope, evidence, and secret checks`
    );
    assert.match(workflow, /required_change_paths/);
    assert.match(workflow, /unexpected_paths|out_of_scope|out-of-scope/i);
    assert.match(workflow, /CANDIDATE_CREATED/);
    assert.match(workflow, /HUMAN_REVIEW_REQUIRED/);
    assert.match(workflow, /PR_CI_PENDING/);
    assert.match(workflow, /test -f scripts\/ai\/include-untracked-in-diff\.sh/);
    assert.match(workflow, /options:\s*(?:\[golden-execution\]|\n\s*- golden-execution)/);
    assert.doesNotMatch(workflow, /FINAL GATE: PROVEN/);
  }
  assert.match(localWorkflow, /CANDIDATE_CREATED/);
});

test('AFX-AI-CLOUD-001: optional cloud workflow dispatches only an existing queue task', async () => {
  const queue = JSON.parse(await read('../tasks/queue.json'));
  const cloudWorkflow = await read('../../.github/workflows/ai-engineering-command-center.yml');
  const taskIds = new Set(queue.tasks.map(task => task.id));
  const defaultTask = cloudWorkflow.match(/default:\s*(AFX-[A-Z0-9-]+)/);
  assert.ok(defaultTask);
  assert.ok(taskIds.has(defaultTask[1]), `Cloud workflow default task is not in the queue: ${defaultTask[1]}`);
  assert.doesNotMatch(cloudWorkflow, /For AFX-GOLDEN-001, the required substantive change is:/);
  assert.match(cloudWorkflow, /required_change_paths/);
});
