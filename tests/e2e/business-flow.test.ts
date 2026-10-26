import { describe, expect, it } from 'vitest';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
describe('business flow security gate', () => {
  it('requires an explicit tenant-scoped permission before a protected business action', () => {
    const core = new AfxCore();
    const user = core.createUser({ email: 'business@example.test', password: 'Correct Horse Battery Staple!' });
    core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['buyer'] });
    const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    const context = core.authenticateAccessToken(tokens.accessToken);
    expect(core.authorize(context, 'order.create', 'tenant-a')).toBe(false);
    core.grantRolePermission('buyer', 'order.create');
    expect(core.authorize(context, 'order.create', 'tenant-a')).toBe(true);
  });
});
