import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("canonical four-protocol policy defines a strict score threshold and final-only rule", () => {
  const policy = read(".ai/policies/four-protocol-engineering.md");
  assert.match(policy, /AFX-FOUR-PROTOCOL-ENGINEERING-001/);
  assert.match(policy, /Minimum release-candidate score: 9\.1\/10/);
  assert.match(policy, /Protocol 1 — Forensics, then implementation/);
  assert.match(policy, /Protocol 2 — Evidence-based score out of 10/);
  assert.match(policy, /Protocol 3 — Architect review, remediation, and re-test/);
  assert.match(policy, /Protocol 4 — Final-only communication and truthful issuance/);
  assert.match(policy, /Do not send interim status\/progress messages/);
  assert.match(policy, /A passing score never overrides a failed\/unknown mandatory gate/);
});

test("supreme constitution and engineering policy mandate the four-protocol loop", () => {
  const constitution = read("AGENTS.md");
  const engineering = read(".ai/policies/engineering.md");
  for (const [name, source] of [["AGENTS.md", constitution], ["engineering policy", engineering]]) {
    assert.match(source, /AFX-FOUR-PROTOCOL-ENGINEERING-001/, name);
    assert.match(source, /9\.1\/10/, name);
    assert.match(source, /interim progress messages/i, name);
    assert.match(source, /remediat/i, name);
  }
});

test("AI Command Center declares the machine-readable protocol requirements", () => {
  const config = read(".ai/command-center.yaml");
  assert.match(config, /four_protocol_engineering:/);
  assert.match(config, /policy: \.ai\/policies\/four-protocol-engineering\.md/);
  assert.match(config, /minimum_candidate_score: 9\.1/);
  assert.match(config, /no_interim_progress_messages: true/);
  assert.match(config, /unknown_blocks_final_candidate: true/);
});

test("all specialized implementation and release agents reference the mandatory threshold", () => {
  const agents = [
    ".github/agents/afaghx-implementer.agent.md",
    ".github/agents/afaghx-architect.agent.md",
    ".github/agents/afaghx-orchestrator.agent.md",
    ".github/agents/afaghx-test-engineer.agent.md",
    ".github/agents/afaghx-evidence-auditor.agent.md",
    ".github/agents/afaghx-security-reviewer.agent.md",
    ".github/agents/afaghx-release-gate.agent.md"
  ];
  for (const file of agents) {
    const source = read(file);
    assert.match(source, /AFX-FOUR-PROTOCOL-ENGINEERING-001/, file);
    assert.match(source, /four-protocol-engineering\.md/, file);
    assert.match(source, /9\.1/, file);
  }
});

test("AI Architecture Gate runs this policy contract test on candidate PRs", () => {
  const workflow = read(".github/workflows/ai-architecture-gate.yml");
  assert.match(workflow, /node --test scripts\/four-protocol-policy\.test\.mjs/);
  assert.match(workflow, /\.ai\/policies\/four-protocol-engineering\.md/);
});
