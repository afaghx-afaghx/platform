import fs from "node:fs";
import assert from "node:assert/strict";

const root = new URL("./", import.meta.url);
const registry = JSON.parse(fs.readFileSync(new URL("module-registry.json", root), "utf8"));
const matrix = JSON.parse(fs.readFileSync(new URL("module-runtime-matrix.json", root), "utf8"));

assert.equal(matrix.spec, "AFX-MODULE-TO-RUNTIME-MATRIX-001");
assert.equal(matrix.version, "1.0");
assert.equal(matrix.status, "CANONICAL-CONTRACT");
assert.equal(matrix.source_registry, "experience/module-registry.json");
assert.deepEqual(matrix.topology, {
  main_entrypoint_count: 1,
  module_entrypoint_count: 17,
  total_public_entrypoints: 18
});
assert.equal(matrix.modules.length, 17);

const registryModules = registry.modules.filter((m) => m.type !== "main-site");
assert.equal(registryModules.length, 17);

const requiredSections = [
  "Subdomain", "Runtime", "API", "Core Security", "Tenant",
  "RBAC", "Tests", "CI", "Runtime URL", "Evidence"
];

const bySlug = new Map(matrix.modules.map((m) => [m.slug, m]));
assert.equal(bySlug.size, 17);

for (const module of registryModules) {
  const row = bySlug.get(module.slug);
  assert.ok(row, `missing matrix row: ${module.slug}`);
  assert.equal(row.id, module.id, `id drift: ${module.slug}`);
  for (const section of requiredSections) assert.ok(row[section] !== undefined, `missing ${section}: ${module.slug}`);

  assert.equal(row.Subdomain, `https://${module.host}`, `subdomain drift: ${module.slug}`);
  assert.equal(row["Runtime URL"], `https://${module.host}/`, `runtime url drift: ${module.slug}`);
  assert.equal(row.API.base, "https://api.afaghx.com");
  assert.equal(row.API.authority, "canonical-api-spine");
  assert.equal(row["Core Security"].authority, "AFX-CORE");
  assert.deepEqual(row["Tenant"].authority, "AFX-CORE");
  assert.deepEqual(row["RBAC"].authority, "AFX-CORE");
  assert.equal(row.Tests.command, "cd experience/web && npm test");
  assert.equal(row.CI.workflow, ".github/workflows/module-runtime-gate.yml");
  assert.equal(row.Evidence.no_claim_without_raw_evidence, true);
  assert.equal(row.Evidence.acceptance, "PROVEN");

  const allowedStates = new Set(["UNPROVEN", "PARTIAL", "MISMATCH", "EXTERNAL_UNVERIFIED", "PROVEN"]);
  assert.ok(allowedStates.has(row.Runtime.observed_state), `invalid runtime state: ${module.slug}`);
  assert.ok(allowedStates.has(row.Evidence.status), `invalid evidence state: ${module.slug}`);

  if (row.Runtime.repository_entrypoint) {
    const path = new URL(`../${row.Runtime.repository_entrypoint}`, root);
    assert.equal(fs.existsSync(path), true, `declared entrypoint missing: ${module.slug}`);
  }

  if (row.Evidence.status === "PROVEN") {
    assert.equal(row.Runtime.observed_state, "PROVEN", `PROVEN evidence without PROVEN runtime: ${module.slug}`);
  }
}

assert.equal(bySlug.get("api").API.base, "https://api.afaghx.com");
assert.equal(bySlug.get("api").Runtime.repository_entrypoint, null);

console.log("PASS: Module-to-Runtime Matrix contract = Main + 17 module entrypoints mapped, all required control sections present, no ungrounded PROVEN claims.");
console.log(`CURRENT EVIDENCE: ${matrix.modules.filter(m => m.Evidence.status === "PROVEN").length}/17 PROVEN; ${matrix.modules.filter(m => m.Evidence.status !== "PROVEN").length}/17 UNPROVEN/PARTIAL/OTHER.`);
