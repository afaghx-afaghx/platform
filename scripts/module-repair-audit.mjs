import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  ['canonical-persistent-core', 'core/AFX-CORE/src/persistent-core.js', true],
  ['canonical-gateway', 'platform/Gateway/runtime.mjs', true],
  ['persistent-audit', 'core/AFX-CORE/src/repository.js', true],
  ['security-workflow', '.github/workflows/afx-core-security.yml', true],
  ['security-scans', '.github/workflows/security-scans.yml', true],
  ['gate-matrix', 'docs/security/AFX-CORE-GATE-01-CLOSURE-MATRIX.md', true],
];

const forbidden = [
  'new AfxCore(',
  'DATABASE_URL',
];

const findings = [];
for (const [name, rel, required] of checks) {
  const exists = fs.existsSync(path.join(root, rel));
  findings.push({ name, path: rel, status: exists === required ? 'PASS' : 'FAIL' });
}

for (const rel of ['core/AFX-CORE/src/core.js']) {
  const file = fs.readFileSync(path.join(root, rel), 'utf8');
  if (forbidden[0] && file.includes(forbidden[0])) {
    findings.push({ name: 'legacy-core-production-usage-scan', path: rel, status: 'REVIEW', reason: 'reference implementation contains in-memory constructor; production imports must remain absent' });
  }
}

const report = { version: 1, generatedAt: new Date().toISOString(), findings };
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifacts', 'module-repair-audit.json'), JSON.stringify(report, null, 2) + '\n');
for (const item of findings) console.log(item.status, item.name, item.path);
if (findings.some(x => x.status === 'FAIL')) process.exit(1);
