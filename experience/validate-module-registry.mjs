import fs from "node:fs";
import assert from "node:assert/strict";

const path = new URL("../module-registry.json", import.meta.url);
const registry = JSON.parse(fs.readFileSync(path, "utf8"));

assert.equal(registry.spec, "AFX-EXPERIENCE-MODULE-REGISTRY-001");
assert.equal(registry.layer, "AFX-EXPERIENCE");
assert.equal(registry.count, 17);
assert.equal(registry.modules.length, 17);
assert.equal(registry.main_site_id, "AFX-00");

const ids = new Set();
const hosts = new Set();
for (const [index, module] of registry.modules.entries()) {
  assert.equal(module.sequence, index);
  assert.ok(module.id);
  assert.ok(module.slug);
  assert.ok(module.name);
  assert.ok(module.host);
  assert.ok(module.api_base);
  assert.equal(module.auth_authority, "AFX-CORE");
  assert.equal(module.status, "defined");
  assert.equal(ids.has(module.id), false, `duplicate module id: ${module.id}`);
  assert.equal(hosts.has(module.host), false, `duplicate host: ${module.host}`);
  ids.add(module.id);
  hosts.add(module.host);
}

console.log(`PASS: ${registry.modules.length} AFAGHX Experience entries are uniquely registered.`);
