import fs from "node:fs";
import assert from "node:assert/strict";

const path = new URL("./module-registry.json", import.meta.url);
const registry = JSON.parse(fs.readFileSync(path, "utf8"));

assert.equal(registry.spec, "AFX-EXPERIENCE-MODULE-REGISTRY-001");
assert.equal(registry.version, "2.0");
assert.equal(registry.layer, "AFX-EXPERIENCE");
assert.equal(registry.count, 18);
assert.equal(registry.modules.length, 18);
assert.equal(registry.main_site_id, "AFX-00");

const expectedRoles = [
  "executive","admin","sell","buyer","affiliate","finance","inventory","logistics",
  "marketing","ads","seo","supplier","factory","services","trust","support"
];

const ids = new Set();
const hosts = new Set();
for (const [index, module] of registry.modules.entries()) {
  assert.equal(module.sequence, index);
  assert.ok(module.id);
  assert.ok(module.slug);
  assert.ok(module.name);
  assert.ok(module.host);
  assert.equal(module.auth_authority, "AFX-CORE");
  assert.equal(module.status, "defined");
  assert.equal(ids.has(module.id), false, `duplicate module id: ${module.id}`);
  assert.equal(hosts.has(module.host), false, `duplicate host: ${module.host}`);
  ids.add(module.id);
  hosts.add(module.host);
}

const main = registry.modules.filter(x => x.type === "main-site");
const spine = registry.modules.filter(x => x.type === "platform-spine");
const roles = registry.modules.filter(x => x.type === "role-module");

assert.equal(main.length, 1);
assert.equal(main[0].host, "www.afaghx.com");
assert.equal(spine.length, 1);
assert.equal(spine[0].host, "api.afaghx.com");
assert.equal(roles.length, 16);

const roleSlugs = new Set(roles.map(x => x.slug));
assert.deepEqual([...roleSlugs].sort(), [...expectedRoles].sort());
assert.equal(roleSlugs.has("service"), false);

const services = registry.modules.find(x => x.slug === "services");
assert.ok(services);
assert.equal(services.host, "services.afaghx.com");

for (const module of registry.modules) {
  assert.equal(module.api_base, "https://api.afaghx.com");
}

console.log("PASS: AFAGHX Experience registry = 18 entries / 16 role modules / 1 main / 1 API spine.");
