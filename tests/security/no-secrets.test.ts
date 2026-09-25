import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const ignored = new Set(['.git', 'node_modules', 'coverage']);
const secretName = /(^|[._-])(secret|password|passwd|token|private[_-]?key|api[_-]?key)([._-]|$)/i;
const secretAssignment = /(?:password|token|api[_-]?key|private[_-]?key)\s*[:=]\s*["'][^"']{8,}["']/i;
function files(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;
    const full = resolve(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) result.push(...files(full));
    else if (stat.isFile() && /\.(ts|tsx|js|mjs|cjs|json|yaml|yml|env)$/i.test(entry)) result.push(full);
  }
  return result;
}
describe('source secret hygiene', () => {
  it('does not contain obvious secret-bearing filenames outside tests', () => {
    const offenders = files(root).filter(path => secretName.test(path.split('/').pop() ?? '') && !path.includes('/tests/'));
    expect(offenders).toEqual([]);
  });
  it('does not contain obvious hard-coded credential assignments', () => {
    const offenders = files(root).filter(path => {
      const content = readFileSync(path, 'utf8');
      return secretAssignment.test(content) && !path.includes('/tests/security/no-secrets.test.ts');
    });
    expect(offenders).toEqual([]);
  });
});
