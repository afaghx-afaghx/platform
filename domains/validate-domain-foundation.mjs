import { readFileSync } from 'node:fs';

const registry = JSON.parse(readFileSync(new URL('./domain-registry.json', import.meta.url), 'utf8'));
const expected = ['product','commerce','order','factory','supplier','service','partner','marketing','advertising','logistics','payment'];
const ids = registry.domains.map((d) => d.id);
const owners = registry.domains.map((d) => d.owner);

const failures = [];
if (registry.spec !== 'AFX-DOMAIN-REGISTRY-001') failures.push('wrong registry spec');
if (registry.version !== '1.0') failures.push('wrong registry version');
if (registry.rules.single_owner_per_entity !== true) failures.push('single-owner rule disabled');
if (registry.rules.direct_cross_domain_db_access !== false) failures.push('direct cross-domain DB access is not forbidden');
if (ids.length !== expected.length) failures.push(`expected ${expected.length} domains, found ${ids.length}`);
if (ids.some((id, index) => id !== expected[index])) failures.push('canonical domain ordering/content mismatch');
if (new Set(ids).size !== ids.length) failures.push('duplicate domain id');
if (new Set(owners).size !== owners.length) failures.push('duplicate domain owner');
for (const domain of registry.domains) {
  if (!domain.name || !domain.owner || !Array.isArray(domain.capabilities) || domain.capabilities.length === 0) {
    failures.push(`incomplete registry entry: ${domain.id || '<unknown>'}`);
  }
}

if (failures.length) {
  console.error('DOMAIN FOUNDATION GATE: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`DOMAIN FOUNDATION GATE: PASS (${registry.domains.length} bounded contexts)`);
