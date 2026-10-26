import { describe, expect, it } from 'vitest';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
describe('fail-closed security behavior', () => {
  it('rejects malformed access credentials', () => {
    const core = new AfxCore();
    expect(() => core.authenticateAccessToken('')).toThrow('unauthorized');
    expect(() => core.authenticateAccessToken('not-a-valid-token')).toThrow('unauthorized');
  });
  it('denies missing security context', () => {
    const core = new AfxCore();
    expect(core.authorize(undefined, 'resource.read', 'tenant-a')).toBe(false);
    expect(core.authorize({ userId: 'usr-a', tenantId: 'tenant-a' }, 'resource.read', 'tenant-a')).toBe(false);
  });
});
