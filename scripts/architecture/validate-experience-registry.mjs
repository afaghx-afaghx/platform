import { readFile } from 'node:fs/promises';

const file = new URL('../../experience/module-registry.json', import.meta.url);
const registry = JSON.parse(await readFile(file, 'utf8'));
const expectedRoles = [
  'executive','admin','sell','buyer','affiliate','finance','inventory','logistics',
  'marketing','ads','seo','supplier','factory','services','trust','support'
];

if (registry.count !== 18) throw new Error(`Registry count must be 18; got ${registry.count}`);
if (!Array.isArray(registry.modules) || registry.modules.length !== 18) throw new Error('Registry modules array must contain exactly 18 entries');

const ids = new Set(registry.modules.map(x => x.id));
const hosts = new Set(registry.modules.map(x => x.host));
if (ids.size !== 18) throw new Error('Registry IDs must be unique');
if (hosts.size !== 18) throw new Error('Registry hosts must be unique');

const main = registry.modules.filter(x => x.type === 'main-site');
const spine = registry.modules.filter(x => x.type === 'platform-spine');
const roles = registry.modules.filter(x => x.type === 'role-module');
if (main.length !== 1 || main[0].host !== 'www.afaghx.com') throw new Error('Exactly one canonical main-site entry is required');
if (spine.length !== 1 || spine[0].host !== 'api.afaghx.com') throw new Error('Exactly one canonical API spine entry is required');
if (roles.length !== 16) throw new Error('Exactly 16 role-module entries are required');

const roleSlugs = new Set(roles.map(x => x.slug));
for (const slug of expectedRoles) if (!roleSlugs.has(slug)) throw new Error(`Missing canonical role module: ${slug}`);
if (roleSlugs.has('service')) throw new Error('Legacy service slug is forbidden; use services');
const services = registry.modules.find(x => x.slug === 'services');
if (!services || services.host !== 'services.afaghx.com') throw new Error('Canonical Services entry must use services.afaghx.com');

for (const entry of registry.modules) {
  if (entry.auth_authority !== 'AFX-CORE') throw new Error(`Non-Core auth authority: ${entry.id}`);
  if (entry.api_base !== 'https://api.afaghx.com') throw new Error(`Non-canonical API base: ${entry.id}`);
}
console.log('AFAGHX Experience registry: 18 entries / 16 role modules / 1 main / 1 API spine — VALID');
