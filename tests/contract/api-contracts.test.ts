import { describe, expect, it } from 'vitest';
import { fileExists, readRepoFile } from '../tooling/helpers';
describe('API contract boundary', () => {
  it('defines versioned API contract types', () => {
    expect(fileExists('packages/contracts/src/api.ts')).toBe(true);
    const source = readRepoFile('packages/contracts/src/api.ts');
    expect(source).toMatch(/v1|version/i);
    expect(source).toMatch(/Api|API/);
  });
});
