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
  assert.match(workflow, /npm install -g opencode-ai/);
  assert.match(workflow, /Include generated evidence and any late untracked model output before scanning/);
  assert.match(workflow, /Secret-like generated file detected/);
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
  assert.match(workflow, /runs-on:\s*\[self-hosted, linux, x64, afaghx-ai\]/);
  assert.match(workflow, /environment:\s*afaghx-ai-execute/);
  assert.match(workflow, /scripts\/ai\/local-agent-preflight\.sh/);
  assert.match(workflow, /scripts\/ai\/run-local-agent\.sh/);
  assert.doesNotMatch(workflow, /secrets\.OPENAI_API_KEY|openai\/codex-action/i);
  assert.doesNotMatch(workflow, /on:\s*\n\s*push:/);

  // Preflight fails closed when the local engine, required model, or tools are absent.
  assert.match(preflight, /command -v ollama/);
  assert.match(preflight, /command -v opencode/);
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

  // The OpenCode model and endpoint must be local and match the governed registry.
  assert.equal(openCode.model, 'ollama/qwen2.5-coder:14b');
  assert.equal(openCode.providers.ollama.settings.baseURL, 'http://127.0.0.1:11434/v1');
  assert.equal(openCode.providers.ollama.models['qwen2.5-coder:14b'].name, 'Qwen 2.5 Coder 14B');
});
