import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('AFX-GOLDEN-LOCAL-001: local Ollama execution is governed and provider-local', async () => {
  const providers = await read('../providers.yaml');
  const commandCenter = await read('../command-center.yaml');
  const queue = JSON.parse(await read('../tasks/queue.json'));
  const workflow = await read('../../.github/workflows/ai-engineering-command-center-local.yml');
  const preflight = await read('../../scripts/ai/local-agent-preflight.sh');
  const launcher = await read('../../scripts/ai/run-local-agent.sh');
  const loop = await read('./agent-loop.py');
  const golden = await read('./golden-execution.contract.test.mjs');
  assert.match(loop, /'truth_state':'TESTED' if success else 'RED'/);
  assert.match(loop, /'system_production_gate_evaluated':False/);
  assert.doesNotMatch(loop, /'truth_state':'PROVEN'/);
  assert.match(workflow, /git ls-files --others --exclude-standard/);
  assert.match(workflow, /test "\$GITHUB_REF_NAME" = "ai\/remediate-local-ollama-provider-contract"/);
  assert.match(workflow, /Overlay audited controller onto main baseline/);
  assert.match(workflow, /ref: main/);
  assert.match(workflow, /git show/);
  assert.match(workflow, /test ! -e \.ai\/runtime\/local-provider\.contract\.test\.mjs/);
  assert.match(workflow, /AFX_AGENT_BASELINE_SHA/);
  assert.match(workflow, /controller-candidate-sha\.txt/);
  assert.match(workflow, /test "\$MODE" = "golden-execution"/);
  assert.match(workflow, /test "\$TASK_ID" = "AFX-GOLDEN-LOCAL-001"/);
  assert.match(workflow, /test "\$REQUESTED_MODEL" = "ollama\/qwen2\.5-coder:14b"/);
  assert.match(workflow, /TASK EXECUTION: TESTED \(system-level PROVEN not evaluated\)/);
  assert.doesNotMatch(workflow, /FINAL GATE: PROVEN/);
  assert.ok(workflow.includes('npm install -g "opencode-ai@${AFAGHX_OPENCODE_VERSION}"'));
  assert.ok(workflow.includes("AFAGHX_OPENCODE_VERSION: '1.19.3'"));
  assert.match(workflow, /Include generated evidence and any late untracked model output before scanning/);
  assert.match(workflow, /Secret-like generated file detected/);
  assert.match(workflow, /Unexpected path outside golden task allowlist/);
  assert.ok(workflow.includes('agent-evidence/*'));
  assert.ok(workflow.includes("Snapshot audited controller files before agent"));
  assert.ok(workflow.includes('sha256sum -c "$RUNNER_TEMP/afaghx-agent-controller-${GITHUB_RUN_ID}.sha256"'));
  assert.ok(workflow.includes("test ! -e agent-evidence"));
  assert.ok(workflow.includes("controller-files-pre-agent.sha256"));
  assert.equal(workflow.split('npm ci --no-audit --no-fund').length - 1, 2);
  assert.equal(workflow.split('rm -rf core/AFX-CORE/node_modules').length - 1, 2);
  assert.ok(workflow.includes('Install locked AFX-CORE dependencies for agent verification'));
  assert.ok(workflow.includes('Install locked dependencies for deterministic verification'));
  assert.ok(workflow.includes("ast.parse(Path('.ai/runtime/agent-loop.py').read_text())"));
  assert.ok(!workflow.includes('python3 -m py_compile .ai/runtime/agent-loop.py'));
  assert.match(workflow, /test -s agent-execution-report\.md/);
  assert.match(workflow, /test -s agent-execution-notes\.md/);
  assert.match(workflow, /grep -Fq \"\$marker\"/);
  assert.match(workflow, /primary_provider/);
  assert.match(workflow, /actions\/upload-artifact@v4\n        if: always\(\)/);
  assert.match(workflow, /if-no-files-found: warn/);
  const openCode = JSON.parse(await read('../../opencode.json'));
  const agent = await read('../../.opencode/agents/afaghx-engineer.md');

  // The no-paid-credit provider must remain the primary implementation path.
  assert.match(providers, /primary_provider:\s*local-ollama/);
  assert.match(providers, /primary_path_must_not_depend_on_paid_credits:\s*true/);
  assert.match(providers, /paid_provider_required:\s*false/);
  assert.match(commandCenter, /provider:\s*local-ollama/);
  assert.match(commandCenter, /paid_provider_required:\s*false/);
  assert.match(commandCenter, /unknown_is_not_green:\s*true/);

  // The designated task must test this contract and the loop must allow that test.
  const task = queue.tasks.find(item => item.id === 'AFX-GOLDEN-LOCAL-001');
  assert.ok(task, 'local golden task must exist');
  // READY is the execution precondition; DONE is valid evidence after an execution.
  assert.ok(['READY', 'DONE'].includes(task.status), 'task state must be governed');
  assert.deepEqual(task.required_change_paths, ['.ai/runtime/local-provider.contract.test.mjs']);
  assert.ok(task.verification.commands.some(command =>
    JSON.stringify(command) === JSON.stringify(['node', '--test', '.ai/runtime/local-provider.contract.test.mjs'])
  ));
  assert.match(loop, /\('node','--test','\.ai\/runtime\/local-provider\.contract\.test\.mjs'\)/);

  // Execution must be opt-in and land on the explicitly registered self-hosted runner.
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /group:\s*afaghx-autonomous-engineering-agent-local-\$\{\{\s*github\.ref\s*\}\}/);
  assert.match(workflow, /runs-on:\s*\[self-hosted, linux, x64, afaghx-ai\]/);
  assert.match(workflow, /environment:\s*afaghx-ai-execute/);
  assert.match(workflow, /scripts\/ai\/local-agent-preflight\.sh/);
  assert.ok(workflow.includes('            opencode.json \\'));
  assert.ok(workflow.includes('            scripts/ai/local-agent-preflight.sh \\'));
  assert.match(golden, /openCode\\.provider\\.ollama\\.options\\.baseURL/);
  assert.doesNotMatch(golden, /openCode\\.providers/);
  assert.match(workflow, /scripts\/ai\/run-local-agent\.sh/);
  assert.doesNotMatch(workflow, /secrets\.OPENAI_API_KEY|openai\/codex-action/i);
  assert.doesNotMatch(workflow, /on:\s*\n\s*push:/);

  // Preflight fails closed when the local engine, required model, or tools are absent.
  assert.match(preflight, /command -v ollama/);
  assert.match(preflight, /command -v opencode/);
  assert.match(preflight, /EXPECTED_OPENCODE_VERSION/);
  assert.match(preflight, /opencode_version_mismatch/);
  assert.match(preflight, /command -v docker/);
  assert.match(preflight, /\$\{OLLAMA_URL\}\/api\/tags/);
  assert.match(preflight, /required_local_model_missing/);

  // The actual executor uses the configured local model and explicitly clears paid keys.
  assert.match(launcher, /AFX_AGENT_BASELINE_SHA:-/);
  assert.match(launcher, /opencode run --standalone --model/);
  assert.match(launcher, /--agent afaghx-engineer/);
  assert.match(launcher, /export OPENAI_API_KEY=''/);
  assert.match(launcher, /export REVIEW_AI_API_KEY=''/);
  assert.match(launcher, /\.ai\/runtime\/local-provider\.contract\.test\.mjs/);
  assert.match(agent, /Never push, merge, deploy, or create a pull request/);
  assert.match(agent, /Never create a git commit/);
  assert.match(agent, /For the Golden task AFX-GOLDEN-LOCAL-001/);
  assert.match(agent, /\.ai\/runtime\/local-provider\.contract\.test\.mjs/);
  assert.doesNotMatch(agent, /AFX-GOLDEN-001/);
  assert.match(workflow, /\.opencode\/agents\/afaghx-engineer\.md/);
  assert.match(workflow, /opencode\.json/);
  assert.match(workflow, /scripts\/ai\/local-agent-preflight\.sh/);

  // The OpenCode model and endpoint must be local and match the governed registry.
  assert.equal(openCode.model, 'ollama/qwen2.5-coder:14b');
  assert.equal(openCode.provider.ollama.npm, '@ai-sdk/openai-compatible');
  assert.equal(openCode.provider.ollama.options.baseURL, 'http://127.0.0.1:11434/v1');
  assert.equal(openCode.provider.ollama.models['qwen2.5-coder:14b'].name, 'Qwen 2.5 Coder 14B');
  assert.equal(Object.hasOwn(openCode, 'providers'), false);
  assert.equal(Object.hasOwn(openCode, 'permissions'), false);
  assert.equal(openCode.permission['*'], 'deny');
  assert.equal(openCode.permission.bash['*'], 'deny');
  assert.equal(openCode.permission.edit['.ai/runtime/local-provider.contract.test.mjs'], 'allow');
  assert.equal(Object.hasOwn(openCode.permission.bash, 'node *'), false);
  assert.equal(Object.hasOwn(openCode.permission.bash, 'python3 *'), false);
  assert.equal(Object.hasOwn(openCode.permission.bash, 'npm *'), false);
  assert.ok(!agent.includes('"node *": allow'));
  assert.ok(!agent.includes('"python3 *": allow'));
  assert.ok(!agent.includes('"ls *": allow'));
  assert.ok(agent.includes('"node --test .ai/runtime/local-provider.contract.test.mjs": allow'));
});
