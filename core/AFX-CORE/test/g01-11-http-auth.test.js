import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';
import { createHttpSecurityBoundary, redactCredential } from '../src/http-security.js';

function setup() {
  const events = [];
  const core = new AfxCore({ audit: event => events.push(event) });
  const user = core.createUser({ email: 'Admin@Example.com', password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
  core.grantRolePermission('admin', 'invoice.read');
  return { core, user, events };
}
function login(core) { return core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' }); }

test('G01-11 missing and malformed Authorization returns 401', async () => {
  const { core } = setup(); const boundary = createHttpSecurityBoundary({ core });
  assert.equal((await boundary({ headers: {} }, { permission: 'invoice.read', resourceTenantId: 'tenant-a' })).status, 401);
  assert.equal((await boundary({ headers: { authorization: 'Basic abc' } }, { permission: 'invoice.read', resourceTenantId: 'tenant-a' })).status, 401);
  assert.equal((await boundary({ headers: { authorization: 'Bearer' } }, { permission: 'invoice.read', resourceTenantId: 'tenant-a' })).status, 401);
});

test('G01-11 valid token produces canonical security context', async () => {
  const { core, user } = setup(); const tokens = login(core); const boundary = createHttpSecurityBoundary({ core });
  const result = await boundary({ headers: { authorization: `Bearer ${tokens.accessToken}` } }, { permission: 'invoice.read', resourceTenantId: 'tenant-a' });
  assert.equal(result.ok, true); assert.equal(result.status, 200); assert.equal(result.securityContext.userId, user.id); assert.equal(result.securityContext.tenantId, 'tenant-a'); assert.deepEqual(result.securityContext.roles, ['admin']);
});

test('G01-11 tenant mismatch and missing permission return 403', async () => {
  const { core } = setup(); const tokens = login(core); const boundary = createHttpSecurityBoundary({ core });
  assert.equal((await boundary({ headers: { authorization: `Bearer ${tokens.accessToken}` } }, { permission: 'invoice.read', resourceTenantId: 'tenant-b' })).status, 403);
  assert.equal((await boundary({ headers: { authorization: `Bearer ${tokens.accessToken}` } }, { permission: 'billing.delete', resourceTenantId: 'tenant-a' })).status, 403);
});

test('G01-11 expired and revoked tokens remain 401', async () => {
  let now = 0; const core = new AfxCore({ clock: () => now });
  const user = core.createUser({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] }); core.grantRolePermission('admin', 'invoice.read');
  const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' }); const boundary = createHttpSecurityBoundary({ core });
  now = 300001; assert.equal((await boundary({ headers: { authorization: `Bearer ${tokens.accessToken}` } }, { permission: 'invoice.read', resourceTenantId: 'tenant-a' })).status, 401);
  now = 0; const fresh = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' }); core.revokeSession(fresh.sessionId);
  assert.equal((await boundary({ headers: { authorization: `Bearer ${fresh.accessToken}` } }, { permission: 'invoice.read', resourceTenantId: 'tenant-a' })).status, 401);
});

test('G01-11 raw credentials never enter the returned security context', async () => {
  const { core } = setup(); const tokens = login(core); const boundary = createHttpSecurityBoundary({ core });
  const result = await boundary({ headers: new Headers({ Authorization: `Bearer ${tokens.accessToken}` }) }, { permission: 'billing.delete', resourceTenantId: 'tenant-a' });
  const serialized = JSON.stringify(result); assert.equal(serialized.includes(tokens.accessToken), false); assert.equal(serialized.includes(tokens.refreshToken), false); assert.equal(redactCredential(tokens.accessToken), '[REDACTED]');
});
