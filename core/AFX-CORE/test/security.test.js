import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';
import { hashPassword, verifyPassword } from '../src/security.js';

function setup() {
  const events = [];
  const core = new AfxCore({ audit: event => events.push(event) });
  const user = core.createUser({ email: 'Admin@Example.com', password: 'Correct Horse Battery Staple!' });
  const organization = core.createOrganization({ name: 'Test Organization', slug: 'test-organization' });
  const tenant = core.createTenant({ organizationId: organization.id, name: 'Tenant A', slug: 'tenant-a' });
  core.addMembership({ userId: user.id, tenantId: tenant.id, roles: ['admin'] });
  core.grantRolePermission('admin', 'invoice.read');
  return { core, user, tenant, organization, events };
}

test('passwords are salted and plaintext is not stored', () => {
  const a = hashPassword('Correct Horse Battery Staple!');
  const b = hashPassword('Correct Horse Battery Staple!');
  assert.notEqual(a, b);
  assert.match(a, /^scrypt\$/);
  assert.equal(verifyPassword('Correct Horse Battery Staple!', a), true);
  assert.equal(verifyPassword('wrong password', a), false);
});

test('login creates a short-lived access token and refresh family', () => {
  const { core, user, tenant } = setup();
  const tokens = core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  assert.equal(typeof tokens.accessToken, 'string');
  assert.equal(typeof tokens.refreshToken, 'string');
  assert.equal(core.authenticateAccessToken(tokens.accessToken).userId, user.id);
});

test('wrong password is rejected without revealing identity state', () => {
  const { core, tenant } = setup();
  assert.throws(() => core.authenticatePassword({ email: 'admin@example.com', password: 'wrong password', tenantId: tenant.id }), /invalid_credentials/);
  assert.throws(() => core.authenticatePassword({ email: 'missing@example.com', password: 'wrong password', tenantId: tenant.id }), /invalid_credentials/);
});

test('cross-tenant authorization is denied', () => {
  const { core, tenant } = setup();
  const tokens = core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  const context = core.authenticateAccessToken(tokens.accessToken);
  assert.equal(core.authorize(context, 'invoice.read', tenant.id), true);
  assert.equal(core.authorize(context, 'invoice.read', 'tenant-nonexistent'), false);
});

test('authorization is deny-by-default', () => {
  const { core, tenant } = setup();
  const tokens = core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  const context = core.authenticateAccessToken(tokens.accessToken);
  assert.equal(core.authorize(context, 'billing.delete', tenant.id), false);
});

test('refresh tokens rotate and reuse revokes the family', () => {
  const { core, tenant } = setup();
  const first = core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  const second = core.refresh(first.refreshToken);
  assert.notEqual(second.refreshToken, first.refreshToken);
  assert.throws(() => core.refresh(first.refreshToken), /refresh_reuse_detected/);
  assert.throws(() => core.authenticateAccessToken(second.accessToken), /unauthorized/);
});

test('session revocation invalidates access and refresh credentials', () => {
  const { core, tenant } = setup();
  const tokens = core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  core.revokeSession(tokens.sessionId);
  assert.throws(() => core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
  assert.throws(() => core.refresh(tokens.refreshToken), /refresh_reuse_detected|invalid_refresh_token/);
});

test('expired access tokens are rejected', () => {
  let now = 0;
  const core = new AfxCore({ clock: () => now });
  const user = core.createUser({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!' });
  const organization = core.createOrganization({ name: 'Test Organization', slug: 'test-organization' });
  const tenant = core.createTenant({ organizationId: organization.id, name: 'Tenant A', slug: 'tenant-a' });
  core.addMembership({ userId: user.id, tenantId: tenant.id, roles: ['admin'] });
  const tokens = core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  now = 300_001;
  assert.throws(() => core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
});

test('audit events contain identifiers but never credentials', () => {
  const { core, tenant, events } = setup();
  const tokens = core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  core.refresh(tokens.refreshToken);
  const serialized = JSON.stringify(events);
  assert.equal(serialized.includes('Correct Horse Battery Staple!'), false);
  assert.equal(serialized.includes(tokens.accessToken), false);
  assert.equal(serialized.includes(tokens.refreshToken), false);
});
