import { describe, expect, it } from 'vitest';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
describe('tenant isolation', () => {
  it('denies access when authenticated context and resource tenant differ', () => {
    const core = new AfxCore();
    const user = core.createUser({ email: 'tenant@example.test', password: 'Correct Horse Battery Staple!' });
    core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['reader'] });
    core.grantRolePermission('reader', 'resource.read');
    const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    const context = core.authenticateAccessToken(tokens.accessToken);
    expect(core.authorize(context, 'resource.read', 'tenant-a')).toBe(true);
    expect(core.authorize(context, 'resource.read', 'tenant-b')).toBe(false);
  });
});
