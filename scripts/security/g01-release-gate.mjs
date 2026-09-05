import { readFileSync, writeFileSync } from 'node:fs';

const matrixPath = 'docs/security/AFX-CORE-GATE-01-CLOSURE-MATRIX.md';
const matrix = readFileSync(matrixPath, 'utf8');
const rows = [...matrix.matchAll(/^\| (G01-\d+) \|.*?\| (DONE|IN PROGRESS|BLOCKED) \|/gm)]
  .map(([, id, status]) => ({ id, status }));

const required = Array.from({ length: 26 }, (_, i) => `G01-${String(i + 1).padStart(2, '0')}`);
const missing = required.filter(id => !rows.some(row => row.id === id));
const unresolved = rows.filter(row => row.status !== 'DONE');
const gateOpen = /\*\*GATE 01 = RED \/ OPEN\.\*\*/.test(matrix);
const domainFreezeActive = /Domain Freeze (?:remains )?active/i.test(matrix);

const report = {
  schema: 'afx.g01.release-gate/v1',
  generatedAt: new Date().toISOString(),
  gate: 'G01',
  policy: 'deny-release-until-all-controls-done',
  gateOpen,
  domainFreezeActive,
  controls: rows,
  missing,
  unresolved,
  decision: missing.length === 0 && unresolved.length === 0 && !gateOpen ? 'PASS' : 'BLOCKED'
};

writeFileSync('g01-release-gate-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.decision !== 'PASS') process.exit(1);
