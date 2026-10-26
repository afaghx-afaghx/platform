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

async function login(core) {
  return core.authenticatePassword({
    email: 'admin@example.com',
    password: 'Correct Horse Battery Staple!',
    tenantId: 'tenant-a',
  });
}

test('G01-11: missing or malformed Authorization is rejected before core authentication', async () => {
  const { core } = setup();
  const boundary = createHttpSecurityBoundary({ core });

  assert.deepEqual(await boundary({ headers: {} }, { permission: 'invoice.read', resourceTenantId: 'tenant-a' }), {
    ok: false,
    status: 401,
    error: 'Invalid authentication credentials',
  });
  assert.equal((await boundary({ headers: { authorization: 'Basic abc' } }, { permission: 'invoice.read', resourceTenantId: 'tenant-a' })).status, 401);
  assert.equal((await boundary({ headers: { authorization: 'Bearer' } }, { permission: 'invoice.read', resourceTenantId: 'tenant-a' })).status, 401);
});

test('G01-11: valid AFX-CORE access token produces the canonical security context', async () => {
  const { core, user } = setup();
  const tokens = await login(core);
  const boundary = createHttpSecurityBoundary({ core });

  const result = await boundary(
    { headers: { authorization: `Bearer ${tokens.accessToken}` } },
    { permission: 'invoice.read', resourceTenantId: 'tenant-a' },
  );

  assert.deepEqual(result, {
    ok: true,
    status: 200,
    securityContext: {
      userId: user.id,
      tenantId: 'tenant-a',
      sessionId: tokens.sessionId,
      roles: ['admin'],
    },
  });
});

test('G01-11: cross-tenant HTTP access is denied by AFX-CORE authorization', async () => {
  const { core } = setup();
  const tokens = await login(core);
  const boundary = createHttpSecurityBoundary({ core });

  const result = await boundary(
    { headers: { authorization: `Bearer ${tokens.accessToken}` } },
    { permission: 'invoice.read', resourceTenantId: 'tenant-b' },
  );

  assert.deepEqual(result, { ok: false, status: 403, error: 'Forbidden' });
});

test('G01-11: authorization is deny-by-default over the existing permission contract', async () => {
  const { core } = setup();
  const tokens = await login(core);
  const boundary = createHttpSecurityBoundary({ core });

  const result = await boundary(
    { headers: { authorization: `Bearer ${tokens.accessToken}` } },
    { permission: 'billing.delete', resourceTenantId: 'tenant-a' },
  );

  assert.deepEqual(result, { ok: false, status: 403, error: 'Forbidden' });
});

test('G01-11: expired and revoked AFX-CORE tokens remain unauthorized at HTTP boundary', async () => {
  let now = 0;
  const core = new AfxCore({ clock: () => now });
  const user = core.createUser({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
  core.grantRolePermission('admin', 'invoice.read');
  const tokens = await login(core);
  const boundary = createHttpSecurityBoundary({ core });

  now = 300_001;
  assert.equal((await boundary({ headers: { authorization: `Bearer ${tokens.accessToken}` } }, { permission: 'invoice.read', resourceTenantId: 'tenant-a' })).status, 401);

  now = 0;
  const fresh = await login(core);
  core.revokeSession(fresh.sessionId);
  assert.equal((await boundary({ headers: { authorization: `Bearer ${fresh.accessToken}` } }, { permission: 'invoice.read', resourceTenantId: 'tenant-a' })).status, 401);
  assert.equal(user.status, 'active');
});

test('G01-11: credentials are never returned by HTTP failures and redaction is non-secret', async () => {
  const { core } = setup();
  const tokens = await login(core);
  const boundary = createHttpSecurityBoundary({ core });
  const result = await boundary({ headers: { authorization: `Bearer ${tokens.accessToken}` } }, { permission: 'billing.delete', resourceTenantId: 'tenant-a' });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(tokens.accessToken), false);
  assert.equal(serialized.includes(tokens.refreshToken), false);
  assert.equal(redactCredential(tokens.accessToken), '[REDACTED]');
});

test('G01-11: Web Headers authorization is accepted without changing the core contract', async () => {
  const { core } = setup();
  const tokens = await login(core);
  const boundary = createHttpSecurityBoundary({ core });

  const result = await boundary(
    { headers: new Headers({ Authorization: `Bearer ${tokens.accessToken}` }) },
    { permission: 'invoice.read', resourceTenantId: 'tenant-a' },
  );

  assert.equal(result.ok, true);
  assert.equal(result.securityContext.tenantId, 'tenant-a');
});
