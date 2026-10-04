import fs from "node:fs/promises";
import path from "node:path";
import dns from "node:dns/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));
const matrix = JSON.parse(await fs.readFile(new URL("./module-runtime-matrix.json", import.meta.url), "utf8"));
const outputDir = path.join(root, "module-runtime-evidence");
const strict = process.env.STRICT_RUNTIME_PROOF === "true";

await fs.mkdir(outputDir, { recursive: true });

async function probe(url) {
  const started = Date.now();
  let dns_result;
  try {
    const hostname = new URL(url).hostname;
    dns_result = await dns.lookup(hostname, { all: true });
  } catch (error) {
    dns_result = {
      error: {
        name: error?.name,
        code: error?.code,
        errno: error?.errno,
        syscall: error?.syscall,
        message: error?.message
      }
    };
  }
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "AFAGHX-Module-Runtime-Probe/1.0" }
    });
    return {
      url,
      observed_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      reachable: true,
      status: response.status,
      location: response.headers.get("location"),
      content_type: response.headers.get("content-type"),
      server: response.headers.get("server"),
      dns_result,
      runtime_reachability: response.status >= 200 && response.status < 400 ? "PROVEN" : "UNPROVEN"
    };
  } catch (error) {
    return {
      url,
      observed_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      reachable: false,
      runtime_reachability: "UNPROVEN",
      dns_result,
      error: {
        name: error?.name,
        code: error?.code,
        errno: error?.errno,
        syscall: error?.syscall,
        message: error?.message,
        cause_name: error?.cause?.name,
        cause_code: error?.cause?.code,
        cause_errno: error?.cause?.errno,
        cause_syscall: error?.cause?.syscall,
        cause_message: error?.cause?.message
      }
    };
  }
}

const CONTROL_URL = "https://afaghx-afaghx.github.io/platform/";
const control = await probe(CONTROL_URL);
const results = [];
for (const module of matrix.modules) {
  const runtime = await probe(module["Runtime URL"]);
  const evidence = {
    spec: "AFX-MODULE-RUNTIME-EVIDENCE-001",
    version: "1.0",
    module_id: module.id,
    slug: module.slug,
    runtime_url: module["Runtime URL"],
    probe: runtime,
    api: { base: module.API.base },
    core_security: { authority: module["Core Security"].authority, controls: module["Core Security"].required_controls },
    tenant: { authority: module.Tenant.authority, required: module.Tenant.required, audit_required: module.Tenant.audit_required },
    rbac: { authority: module.RBAC.authority, deny_by_default: module.RBAC.deny_by_default },
    tests: { command: module.Tests.command, matrix_test: module.Tests.matrix_test },
    ci: { workflow: module.CI.workflow },
    completion_status: runtime.runtime_reachability === "PROVEN" ? "UNPROVEN" : "UNPROVEN",
    note: "HTTP reachability alone does not prove Core security, tenant isolation or RBAC. Those controls require independent machine evidence."
  };
  results.push(evidence);
  await fs.writeFile(path.join(outputDir, `${module.slug}.json`), JSON.stringify(evidence, null, 2) + "\n");
}

const summary = {
  spec: "AFX-MODULE-RUNTIME-EVIDENCE-SUMMARY-001",
  generated_at: new Date().toISOString(),
  strict,
  total: results.length,
  control_runtime: control,
  runtime_reachable: results.filter(x => x.probe.runtime_reachability === "PROVEN").length,
  runtime_unproven: results.filter(x => x.probe.runtime_reachability !== "PROVEN").length,
  completion_proven: results.filter(x => x.completion_status === "PROVEN").length,
  rule: "Completion can be PROVEN only after runtime + Core security + tenant + RBAC + tests + CI evidence are independently accepted."
};
await fs.writeFile(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));

if (strict && summary.runtime_unproven > 0) {
  console.error("STRICT_RUNTIME_PROOF failed: one or more canonical module URLs are not runtime-proven.");
  process.exit(2);
}
