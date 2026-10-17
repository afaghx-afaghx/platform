import { describe, expect, it } from 'vitest';
import { fileExists, readRepoFile } from '../tooling/helpers';
describe('packages/contracts v1 foundation', () => {
  it('exists with an explicit v1 entry point', () => {
    expect(fileExists('packages/contracts/src/index.ts')).toBe(true);
    expect(readRepoFile('packages/contracts/src/version.ts')).toMatch(/v1/);
  });
  it('contains core identity and tenant contract symbols', () => {
    const source = readRepoFile('packages/contracts/src/index.ts');
    for (const symbol of ['User', 'Organization', 'Membership', 'TenantContext', 'AuthorizationDecision']) expect(source).toContain(symbol);
  });
});
