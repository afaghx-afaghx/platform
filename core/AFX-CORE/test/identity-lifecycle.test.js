import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';

function setup() {
  const events = [];
  const core = new AfxCore({ audit: event => events.push(event) });
  const user = core.createUser({ email: 'Admin@Example.com', password: 'Correct Horse Battery Staple!' });
  const organization = core.createOrganization({ name: 'Test Organization', slug: 'test-organization' });
  const tenant = core.createTenant({ organizationId: organization.id, name: 'Tenant A', slug: 'tenant-a' });
  core.addMembership({ userId: user.id, tenantId: tenant.id, roles: ['admin'] });
  return { core, user, tenant, organization, events };
}

test('identity exposes a stable public identifier and normalized email', () => {
  const { core, user } = setup();
  const identity = core.getUser(user.id);
  assert.equal(identity.id, user.id);
  assert.equal(identity.email, 'admin@example.com');
  assert.equal(identity.status, 'active');
});

test('identity lifecycle permits only explicit safe transitions', () => {
  const { core, user } = setup();
  assert.equal(core.changeUserStatus({ userId: user.id, status: 'disabled' }).status, 'disabled');
  assert.equal(core.changeUserStatus({ userId: user.id, status: 'active' }).status, 'active');
  assert.equal(core.changeUserStatus({ userId: user.id, status: 'locked' }).status, 'locked');
  assert.equal(core.changeUserStatus({ userId: user.id, status: 'active' }).status, 'active');
  assert.equal(core.changeUserStatus({ userId: user.id, status: 'deleted' }).status, 'deleted');
  assert.throws(() => core.changeUserStatus({ userId: user.id, status: 'active' }), /invalid_identity_transition/);
});

test('disabling an identity revokes all active sessions and refresh families', () => {
  const { core, user, tenant } = setup();
  const first = core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  const second = core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  core.changeUserStatus({ userId: user.id, status: 'disabled' });
  assert.throws(() => core.authenticateAccessToken(first.accessToken), /unauthorized/);
  assert.throws(() => core.authenticateAccessToken(second.accessToken), /unauthorized/);
  assert.throws(() => core.refresh(first.refreshToken), /refresh_reuse_detected|invalid_refresh_token/);
  assert.throws(() => core.refresh(second.refreshToken), /refresh_reuse_detected|invalid_refresh_token/);
});

test('disabled or deleted identities cannot authenticate and deletion is terminal', () => {
  const { core, user, tenant } = setup();
  core.changeUserStatus({ userId: user.id, status: 'disabled' });
  assert.throws(() => core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: tenant.id }), /invalid_credentials/);
  core.changeUserStatus({ userId: user.id, status: 'deleted' });
  assert.throws(() => core.changeUserStatus({ userId: user.id, status: 'active' }), /invalid_identity_transition/);
});

test('invalid identity lifecycle input is rejected without changing state', () => {
  const { core, user } = setup();
  assert.throws(() => core.changeUserStatus({ userId: user.id, status: 'unknown' }), /invalid_identity_status/);
  assert.equal(core.getUser(user.id).status, 'active');
  assert.throws(() => core.changeUserStatus({ userId: 'missing-user', status: 'disabled' }), /identity_not_found/);
});

test('status change audit contains identifiers but no credentials', () => {
  const { core, user, events } = setup();
  core.changeUserStatus({ userId: user.id, status: 'disabled' });
  const serialized = JSON.stringify(events);
  assert.equal(serialized.includes('Correct Horse Battery Staple!'), false);
  assert.equal(serialized.includes(user.id), true);
  assert.equal(serialized.includes('identity.user.status_changed'), true);
});
