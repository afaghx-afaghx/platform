import { describe, expect, it } from 'vitest';
import { fileExists } from '../tooling/helpers';
describe('DOMAIN ↔ DATABASE boundary', () => {
  it('has a canonical database governance surface', () => {
    expect(fileExists('database/README.md')).toBe(true);
    expect(fileExists('database/schema/README.md')).toBe(true);
  });
  it('does not establish an Experience direct database path', () => {
    expect(fileExists('experience/database.ts')).toBe(false);
    expect(fileExists('experience/db.ts')).toBe(false);
  });
});
