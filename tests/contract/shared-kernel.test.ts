import { describe, expect, it } from 'vitest';
import { fileExists, readRepoFile } from '../tooling/helpers';
describe('shared-kernel boundary', () => {
  it('exists with domain-neutral primitives', () => {
    expect(fileExists('packages/shared-kernel/src/index.ts')).toBe(true);
    const source = readRepoFile('packages/shared-kernel/src/index.ts');
    for (const symbol of ['Result', 'Entity', 'ValueObject', 'DomainEvent', 'Clock', 'IdGenerator']) expect(source).toContain(symbol);
  });
});
