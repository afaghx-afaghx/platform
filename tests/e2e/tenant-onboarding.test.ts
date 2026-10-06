import { describe, expect, it } from 'vitest';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
describe('tenant onboarding flow', () => {
  it('requires membership before tenant-scoped authentication succeeds', () => {
    const core = new AfxCore();
    const user = core.createUser({ email: 'onboarding@example.test', password: 'Correct Horse Battery Staple!' });
    expect(() => core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' })).toThrow('tenant_access_denied');
    core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['owner'] });
    expect(core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' }).tokenType).toBe('Bearer');
  });
});
