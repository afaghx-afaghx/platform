import { readFile } from 'node:fs/promises';

const raw = await readFile('docs/security/AFX-G01-THREAT-CONTROL-MAP.yaml', 'utf8');
const lines = raw.split(/\r?\n/);
const required = ['G01-17','G01-18','G01-19','G01-20','G01-21','G01-22','G01-23','G01-24','G01-25','G01-26'];
const missing = required.filter((control) => !new RegExp(`^  ${control}:`, 'm').test(raw));
const errors = [];

for (const control of required) {
  const start = lines.findIndex((line) => line === `  ${control}:`);
  const next = lines.findIndex((line, index) => index > start && /^  G01-\d+:$/.test(line));
  const block = lines.slice(start, next === -1 ? lines.length : next).join('\n');
  if (!block.includes('owner:')) errors.push(`${control}: owner missing`);
  if (!block.includes('threat_ids:')) errors.push(`${control}: threat_ids missing`);
  if (!block.includes('implementation:')) errors.push(`${control}: implementation missing`);
  if (!block.includes('tests:')) errors.push(`${control}: tests missing`);
  if (!block.includes('evidence:')) errors.push(`${control}: evidence missing`);

  const testsEmpty = /tests:\s*\[\s*\]/.test(block);
  const blockerPresent = /blocker:/.test(block);
  if (testsEmpty && !blockerPresent) errors.push(`${control}: empty tests require an explicit blocker`);
}

const result = {
  schema: 'afx-threat-control-map-validation/v1',
  controls_checked: required.length,
  missing,
  errors,
  valid: missing.length === 0 && errors.length === 0
};

console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exit(1);
