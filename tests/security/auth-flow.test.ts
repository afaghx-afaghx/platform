import { describe, expect, it } from 'vitest';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
describe('authentication flow', () => {
  it('resolves identity and tenant membership before returning access credentials', () => {
    const core = new AfxCore();
    const user = core.createUser({ email: 'auth@example.test', password: 'Correct Horse Battery Staple!' });
    core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['member'] });
    const result = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    const context = core.authenticateAccessToken(result.accessToken);
    expect(context.userId).toBe(user.id);
    expect(context.tenantId).toBe('tenant-a');
  });
  it('rejects a valid identity without the requested tenant membership', () => {
    const core = new AfxCore();
    const user = core.createUser({ email: 'auth2@example.test', password: 'Correct Horse Battery Staple!' });
    core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['member'] });
    expect(() => core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-b' })).toThrow('tenant_access_denied');
  });
});
