import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';

function setup() {
  const events = [];
  const core = new AfxCore({ audit: event => events.push(event) });
  const user = core.createUser({ email: 'policy@example.com', password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
  core.grantRolePermission('admin', 'invoice.read');
  return { core, user, events };
}

test('policy allows RBAC-authorized access when no deny policy applies', async () => {
  const { core, user } = setup();
  const result = await core.evaluatePolicy(
    { userId: user.id, tenantId: 'tenant-a', roles: ['admin'] },
    { permission: 'invoice.read', resourceTenantId: 'tenant-a', resourceState: 'active' }
  );
  assert.equal(result.decision, 'allow');
  assert.deepEqual(result.policyIds, []);
  assert.deepEqual(result.reasons, ['no_applicable_deny_policy']);
  assert.match(result.evaluatedAt, /T/);
  assert.equal(core.authorize(
    { userId: user.id, tenantId: 'tenant-a' },
    'invoice.read',
    'tenant-a'
  ), true);
});

test('tenant-scoped deny policy blocks matching tenant and permission', async () => {
  const { core, user, events } = setup();
  core.registerPolicy({
    id: 'pol-deny-invoice-tenant-a',
    effect: 'deny',
    permission: 'invoice.read',
    tenantId: 'tenant-a',
    reason: 'invoice_access_restricted',
    priority: 10
  });

  const context = { userId: user.id, tenantId: 'tenant-a', roles: ['admin'] };
  const result = await core.evaluatePolicy(context, {
    permission: 'invoice.read',
    resourceTenantId: 'tenant-a'
  });
  assert.equal(result.decision, 'deny');
  assert.deepEqual(result.policyIds, ['pol-deny-invoice-tenant-a']);
  assert.deepEqual(result.reasons, ['invoice_access_restricted']);
  assert.equal(core.authorize(context, 'invoice.read', 'tenant-a'), false);
  assert.equal(events.length, 0);
});

test('subject and role constraints are enforced', async () => {
  const { core, user } = setup();
  core.registerPolicy({
    id: 'pol-role-deny',
    effect: 'deny',
    permission: 'invoice.read',
    tenantId: 'tenant-a',
    roles: ['blocked-role'],
    reason: 'blocked_role'
  });

  const context = { userId: user.id, tenantId: 'tenant-a', roles: ['admin'] };
  const result = await core.evaluatePolicy(context, {
    permission: 'invoice.read',
    resourceTenantId: 'tenant-a'
  });
  assert.equal(result.decision, 'allow');

  core.registerPolicy({
    id: 'pol-subject-deny',
    effect: 'deny',
    permission: 'invoice.read',
    tenantId: 'tenant-a',
    subjectId: user.id,
    reason: 'subject_blocked'
  });
  const denied = await core.evaluatePolicy(context, {
    permission: 'invoice.read',
    resourceTenantId: 'tenant-a'
  });
  assert.equal(denied.decision, 'deny');
  assert.deepEqual(denied.policyIds, ['pol-subject-deny']);
});

test('tenant mismatch fails policy evaluation closed', async () => {
  const { core, user } = setup();
  const result = await core.evaluatePolicy(
    { userId: user.id, tenantId: 'tenant-a', roles: ['admin'] },
    { permission: 'invoice.read', resourceTenantId: 'tenant-b' }
  );
  assert.equal(result.decision, 'deny');
  assert.deepEqual(result.reasons, ['tenant_mismatch']);
  assert.deepEqual(result.policyIds, []);
});

test('invalid policy is rejected and only deny effect is accepted', () => {
  const { core } = setup();
  assert.throws(() => core.registerPolicy({ id: 'bad', permission: 'invoice.read' }), /invalid_policy_effect/);
  assert.throws(() => core.registerPolicy({ id: 'bad', effect: 'allow', permission: 'invoice.read' }), /invalid_policy_effect/);
  assert.throws(() => core.registerPolicy({ id: 'bad', effect: 'deny' }), /invalid_policy_permission/);
});

test('policy definitions are immutable after registration', () => {
  const { core } = setup();
  const policy = core.registerPolicy({
    id: 'immutable-policy',
    effect: 'deny',
    permission: 'invoice.read',
    roles: ['admin']
  });
  assert.equal(Object.isFrozen(policy), true);
  assert.equal(Object.isFrozen(policy.roles), true);
  assert.throws(() => policy.roles.push('other'), TypeError);
});
