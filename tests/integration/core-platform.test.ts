import { describe, expect, it } from 'vitest';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
describe('CORE ↔ PLATFORM integration boundary', () => {
  it('authenticates before a protected platform operation is authorized', () => {
    const core = new AfxCore();
    const user = core.createUser({ email: 'core-platform@example.test', password: 'Correct Horse Battery Staple!' });
    core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['operator'] });
    core.grantRolePermission('operator', 'platform.read');
    const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    const context = core.authenticateAccessToken(tokens.accessToken);
    expect(core.authorize(context, 'platform.read', 'tenant-a')).toBe(true);
    expect(core.authorize(context, 'platform.read', 'tenant-b')).toBe(false);
  });
});
