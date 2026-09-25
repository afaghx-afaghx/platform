import { describe, expect, it } from 'vitest';
describe('database benchmark boundary', () => {
  it('requires an explicit test database profile instead of faking a benchmark', () => {
    expect(process.env.DATABASE_URL).toMatch(/^postgresql:\/\//);
    expect(process.env.AFAGHX_TEST_MODE).toBe('true');
  });
});
