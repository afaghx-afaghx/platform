import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';

test('Core exposes authoritative identity and RBAC permission aggregates', () => {
  const core = new AfxCore();
  const user = core.createUser({ email: 'aggregate@example.com', password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['seller', 'manager'] });
  core.grantRolePermission('seller', 'search.read');
  core.grantRolePermission('manager', 'domain:product:read');
  core.grantRolePermission('manager', 'search.read');
  core.grantRolePermission('seller', 'search.read');

  assert.deepEqual(core.getIdentity(user.id), {
    userId: user.id,
    email: 'aggregate@example.com',
    status: 'active'
  });
  assert.deepEqual(core.getMembershipAggregate(user.id, 'tenant-a'), {
    userId: user.id,
    tenantId: 'tenant-a',
    roles: ['seller', 'manager'],
    permissions: ['domain:product:read', 'search.read'],
    status: 'active'
  });
  assert.throws(() => core.getMembershipAggregate(user.id, 'tenant-b'), /membership_not_found/);
});
