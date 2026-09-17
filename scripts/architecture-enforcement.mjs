import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const required = [
  'docs/architecture/AFX-MASTER-ARCH-001-v2.0.md',
  'docs/architecture/AFAGHX-MASTER-ARCHITECTURE-MAP-v2.0.md',
  'docs/architecture/AFAGHX-ARCHITECTURE-MANIFEST-v2.0.json',
  'core/AFX-CORE/src/persistent-core.js',
  'core/AFX-CORE/src/repository.js',
  'platform/Gateway/server.js',
  'platform/Gateway/security-boundary.js',
  'platform/Gateway/migration-runner.js',
];

const forbiddenExperience = [
  /from\s+['"]\.\.\/\.\.\/core\/AFX-CORE\/src\/core\.js['"]/, 
  /new\s+AfxCore\s*\(/,
];

const forbiddenGateway = [
  /new\s+AfxCore\s*\(/,
  /from\s+['"]\.\.\/\.\.\/core\/AFX-CORE\/src\/core\.js['"]/, 
];

async function exists(path) {
  try { await access(join(root, path), constants.F_OK); return true; } catch { return false; }
}

function assertNoMatch(name, text, patterns) {
  for (const pattern of patterns) {
    if (pattern.test(text)) throw new Error(`${name}: forbidden architecture pattern: ${pattern}`);
  }
}

for (const path of required) {
  if (!(await exists(path))) throw new Error(`Missing required canonical artifact: ${path}`);
}

const manifest = JSON.parse(await readFile(join(root, 'docs/architecture/AFAGHX-ARCHITECTURE-MANIFEST-v2.0.json'), 'utf8'));
if (manifest.status !== 'FINAL_CANONICAL') throw new Error('Architecture manifest is not FINAL_CANONICAL');
if (manifest.constitution !== 'AFX-MASTER-ARCH-001 v2.0') throw new Error('Architecture manifest constitution mismatch');
if (manifest.sections.length !== 11) throw new Error(`Expected 11 architecture sections, found ${manifest.sections.length}`);

const experience = await readFile(join(root, 'experience/web/server.js'), 'utf8');
assertNoMatch('Experience server', experience, forbiddenExperience);
if (!/canonical_api_only/.test(experience)) throw new Error('Experience server must reject local API ownership');

const gateway = await readFile(join(root, 'platform/Gateway/server.js'), 'utf8');
assertNoMatch('Canonical gateway', gateway, forbiddenGateway);
for (const requiredPattern of [/PersistentAfxCore/, /PostgresAfxCoreRepository/, /DATABASE_URL/]) {
  if (!requiredPattern.test(gateway)) throw new Error(`Canonical gateway missing required wiring: ${requiredPattern}`);
}

const migration = await readFile(join(root, 'platform/Gateway/migration-runner.js'), 'utf8');
if (!/PostgresAfxCoreRepository/.test(migration)) throw new Error('Migration runner must use the AFX-CORE repository');
if (/createServer|http\.createServer/.test(migration)) throw new Error('Migration runner must not own the HTTP gateway');

const constitution = await readFile(join(root, 'docs/architecture/AFX-MASTER-ARCH-001-v2.0.md'), 'utf8');
for (const requiredRule of [
  'Gateway -> PersistentAfxCore -> PostgreSQL',
  'No GREEN without evidence',
  'frontend-to-database',
  'duplicate production authentication',
]) {
  if (!constitution.includes(requiredRule)) throw new Error(`Constitution missing enforcement rule: ${requiredRule}`);
}

console.log('AFAGHX architecture enforcement: PASS');
console.log(`Canonical sections: ${manifest.sections.length}`);
console.log('Experience -> business API ownership: blocked');
console.log('Gateway -> PersistentAfxCore -> PostgreSQL wiring: present');
console.log('Migration runner -> HTTP gateway coupling: blocked');
