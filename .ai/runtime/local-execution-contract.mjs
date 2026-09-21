#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const out = resolve(root, "agent-evidence");
mkdirSync(out, { recursive: true });

const model = process.env.AFX_LOCAL_MODEL || "llama3.2:3b";
const agentCommand = process.env.AFX_AGENT_COMMAND || "";
const task = process.env.AFX_TASK_ID || "AFX-GOLDEN-001";
const evidence = {
  schema_version: "AFX-LOCAL-EXECUTION-CONTRACT-1",
  contract: "AFX-GOLDEN-LOCAL-001",
  task, truth_state: "UNKNOWN", checks: {}, unknown_is_not_green: true
};
function run(cmd,args=[],opts={}) {
  const p=spawnSync(cmd,args,{cwd:root,encoding:"utf8",...opts});
  return {command:[cmd,...args],exit_code:p.status ?? 1,stdout:(p.stdout||"").slice(-12000),stderr:(p.stderr||"").slice(-4000)};
}
function fail(message){ throw new Error(message); }

try {
  const b=run("git",["branch","--show-current"]);
  const current=b.stdout.trim();
  evidence.checks.branch={current,isolated:Boolean(current)&&current!=="main"};
  if(!evidence.checks.branch.isolated) fail("main is forbidden; execution requires an isolated branch.");

  const base=run("git",["rev-parse","HEAD"]);
  if(base.exit_code!==0) fail("Cannot capture baseline SHA.");
  evidence.baseline_sha=base.stdout.trim();

  const oi=run("ollama",["--version"]);
  evidence.checks.runner={ollama_installed:oi.exit_code===0};
  if(oi.exit_code!==0) fail("Ollama is not installed on this runner.");

  const li=run("ollama",["list"]);
  evidence.checks.local_model={requested:model,available:li.exit_code===0 && li.stdout.split("\n").some(x=>x.startsWith(model+" ")||x.startsWith(model+"\t")),inventory:li.stdout};
  if(!evidence.checks.local_model.available) fail("Required local model is not installed: "+model);

  const prompt=[
    "You are AFX-AI-CEA-001 under AFX-GOLDEN-LOCAL-001.",
    "Read AGENTS.md, .ai/command-center.yaml and .ai/tasks/queue.json.",
    "Approved task: "+task,
    "Return a concise plan. Do not request secrets, main writes, merge, deployment, or destructive operations."
  ].join("\n");
  const mr=spawnSync("ollama",["run",model,prompt],{cwd:root,encoding:"utf8",timeout:120000});
  evidence.checks.model_runtime={command:["ollama","run",model,"<governed prompt>"],exit_code:mr.status ?? 1,output_present:Boolean((mr.stdout||"").trim()),stderr:(mr.stderr||"").slice(-4000)};
  if(mr.status!==0 || !(mr.stdout||"").trim()) fail("Local model invocation failed.");

  if(!agentCommand) fail("AFX_AGENT_COMMAND is not configured. Model runtime alone is not Agent execution.");
  const parts=agentCommand.trim().split(/\s+/);
  const ar=run(parts[0],parts.slice(1));
  evidence.checks.agent_runtime=ar;
  if(ar.exit_code!==0) fail("Agent command failed.");

  const diff=run("git",["diff","--name-only",evidence.baseline_sha]);
  const changed=diff.stdout.split("\n").filter(Boolean);
  evidence.checks.substantive_change={changed_files:changed,present:changed.some(p=>!p.startsWith("agent-evidence/")&&p!=="agent-execution-notes.md")};
  if(!evidence.checks.substantive_change.present) fail("No substantive repository change was produced.");

  const tests=run("node",["--test",".ai/runtime/golden-execution.contract.test.mjs"]);
  evidence.checks.tests=tests;
  if(tests.exit_code!==0) fail("Required contract test failed.");

  evidence.truth_state="TESTED";
  evidence.gate="HUMAN-REVIEW";
  evidence.governance={direct_main_write:false,destructive_operations:false,merge:false,production_deploy:false,pr_allowed_only_after_all_checks:true};
} catch(e) {
  evidence.truth_state="UNKNOWN";
  evidence.gate="NO-GO";
  evidence.error=String(e.message||e);
}
writeFileSync(resolve(out,"local-execution-contract.json"),JSON.stringify(evidence,null,2)+"\n");
console.log(JSON.stringify(evidence,null,2));
if(evidence.gate==="NO-GO") process.exit(1);
