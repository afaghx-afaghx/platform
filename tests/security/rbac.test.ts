import { describe, expect, it } from 'vitest';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
describe('RBAC enforcement', () => {
  it('allows an explicitly granted permission and denies an ungranted permission', () => {
    const core = new AfxCore();
    const user = core.createUser({ email: 'rbac@example.test', password: 'Correct Horse Battery Staple!' });
    core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['reader'] });
    core.grantRolePermission('reader', 'resource.read');
    const token = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    const context = core.authenticateAccessToken(token.accessToken);
    expect(core.authorize(context, 'resource.read', 'tenant-a')).toBe(true);
    expect(core.authorize(context, 'resource.write', 'tenant-a')).toBe(false);
  });
});
