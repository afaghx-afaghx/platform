import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract=readFileSync(new URL("./local-execution-contract.mjs",import.meta.url),"utf8");
const workflow=readFileSync(new URL("../../.github/workflows/afaghx-local-execution-contract.yml",import.meta.url),"utf8");

test("requires isolated branch and forbids main",()=>{
  assert.match(contract,/current!=="main"/);
  assert.match(workflow,/runs-on: self-hosted/);
  assert.match(workflow,/git switch -c/);
  assert.match(workflow,/test "\$GITHUB_REF_NAME" != "main"/);
});
test("requires Ollama, local model and real model invocation",()=>{
  assert.match(contract,/ollama/);
  assert.match(contract,/ollama","run/);
  assert.match(workflow,/command -v ollama/);
  assert.match(workflow,/ollama list/);
});
test("requires an explicit Agent adapter",()=>{
  assert.match(contract,/AFX_AGENT_COMMAND/);
  assert.match(contract,/Model runtime alone is not Agent execution/);
  assert.match(workflow,/agent_command:/);
});
test("PR is downstream and targets main only as merge destination",()=>{
  assert.match(workflow,/local-execution-contract\.json/);
  assert.match(workflow,/git push --set-upstream origin/);
  assert.match(workflow,/gh pr create --base main/);
});
