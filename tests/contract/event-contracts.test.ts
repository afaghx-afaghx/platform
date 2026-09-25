import { describe, expect, it } from 'vitest';
import { fileExists, readRepoFile } from '../tooling/helpers';
describe('event contract boundary', () => {
  it('defines explicit event metadata and event types', () => {
    expect(fileExists('packages/contracts/src/events.ts')).toBe(true);
    const source = readRepoFile('packages/contracts/src/events.ts');
    for (const symbol of ['EventMetadata', 'DomainEvent', 'EVENT_TYPES']) expect(source).toContain(symbol);
  });
});
