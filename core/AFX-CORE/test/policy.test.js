import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';

function setup() {
  const audits = [];
  const core = new AfxCore({ audit: event => audits.push(event) });
  const user = core.createUser({ email: 'policy@example.com', password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
  core.grantRolePermission('admin', 'invoice.read');
  return { core, user, audits };
}

function allowPolicy(id='allow-invoice') {
  return {
    id,
    tenantId: 'tenant-a',
    name: id,
    description: 'Explicit product/invoice access',
    priority: 10,
    active: true,
    rules: [{
      subject: { roles: ['admin'] },
      resource: { type: 'invoice', tenantScoped: true },
      action: 'read',
      effect: 'allow',
      reason: 'ACCESS_ALLOWED'
    }]
  };
}

test('explicit Policy allow proceeds after RBAC', () => {
  const { core, user, audits } = setup();
  const context = { userId: user.id, tenantId: 'tenant-a', roles: ['admin'] };
  assert.equal(core.authorize(context, 'invoice.read', 'tenant-a'), true);
  const result = core.evaluatePolicy(context, { type: 'invoice', id: 'inv-1', tenantId: 'tenant-a' }, 'read');
  assert.equal(result.effect, 'abstain');
  core.registerPolicy(allowPolicy());
  const allowed = core.evaluatePolicy(context, { type: 'invoice', id: 'inv-1', tenantId: 'tenant-a' }, 'read');
  assert.equal(allowed.effect, 'allow');
  assert.equal(allowed.policyId, 'allow-invoice');
  assert.equal(audits.filter(x => x.type === 'policy.decision').length, 2);
});

test('Policy abstain is explicit and fail-closed at the Gateway contract', () => {
  const { core, user } = setup();
  const result = core.evaluatePolicy(
    { userId: user.id, tenantId: 'tenant-a', roles: ['admin'] },
    { type: 'invoice', id: 'inv-1', tenantId: 'tenant-a' },
    'delete'
  );
  assert.equal(result.effect, 'abstain');
  assert.equal(result.reason, 'NO_POLICY_MATCHED');
  assert.equal(result.policyId, null);
  assert.equal(Object.isFrozen(result), true);
});

test('deny overrides allow at equal priority and tenant/subject/role rules are enforced', () => {
  const { core, user } = setup();
  core.registerPolicy(allowPolicy('allow-read'));
  core.registerPolicy({
    id: 'deny-read',
    tenantId: 'tenant-a',
    name: 'deny-read',
    priority: 10,
    rules: [{
      subject: { userIds: [user.id] },
      resource: { type: 'invoice', ids: ['inv-1'], tenantScoped: true },
      action: 'read',
      effect: 'deny',
      reason: 'INVOICE_RESTRICTED',
      conditions: [{ attribute: 'resource.state', operator: 'eq', value: 'locked' }]
    }]
  });
  const locked = core.evaluatePolicy(
    { userId: user.id, tenantId: 'tenant-a', roles: ['admin'] },
    { type: 'invoice', id: 'inv-1', tenantId: 'tenant-a', state: 'locked' },
    'read'
  );
  assert.equal(locked.effect, 'deny');
  assert.equal(locked.policyId, 'deny-read');
  const open = core.evaluatePolicy(
    { userId: user.id, tenantId: 'tenant-a', roles: ['admin'] },
    { type: 'invoice', id: 'inv-1', tenantId: 'tenant-a', state: 'open' },
    'read'
  );
  assert.equal(open.effect, 'allow');
});

test('tenant mismatch fails closed before policy lookup', () => {
  const { core, user } = setup();
  const result = core.evaluatePolicy(
    { userId: user.id, tenantId: 'tenant-a', roles: ['admin'] },
    { type: 'invoice', id: 'inv-1', tenantId: 'tenant-b' },
    'read'
  );
  assert.equal(result.effect, 'deny');
  assert.equal(result.reason, 'TENANT_MISMATCH');
});

test('invalid policies are rejected and normalized definitions are immutable', () => {
  const { core } = setup();
  assert.throws(() => core.registerPolicy({ id: 'bad', tenantId: 'tenant-a', name: 'bad', rules: [] }), /invalid_policy_rules/);
  assert.throws(() => core.registerPolicy({
    id: 'bad-effect',
    tenantId: 'tenant-a',
    name: 'bad-effect',
    rules: [{ resource: { type: 'invoice' }, action: 'read', effect: 'partial', reason: 'x' }]
  }), /invalid_policy_rule_effect/);
  const policy = core.registerPolicy(allowPolicy('immutable'));
  assert.equal(Object.isFrozen(policy), true);
  assert.equal(Object.isFrozen(policy.rules), true);
  assert.throws(() => policy.rules.push({}), TypeError);
});


test('Policy engine consumes the canonical immutable SecurityContext shape', () => {
  const { core, user } = setup();
  core.registerPolicy({
    id: 'canonical-context-allow',
    tenantId: 'tenant-a',
    name: 'canonical-context-allow',
    priority: 10,
    rules: [{
      subject: { roles: ['admin'] },
      resource: { type: 'invoice', tenantScoped: true },
      action: 'read',
      effect: 'allow',
      reason: 'ACCESS_ALLOWED'
    }]
  });
  const securityContext = Object.freeze({
    identity: Object.freeze({ userId: user.id }),
    tenant: Object.freeze({ tenantId: 'tenant-a', resolvedFrom: 'session' }),
    membership: Object.freeze({ userId: user.id, tenantId: 'tenant-a', roles: Object.freeze(['admin']), status: 'active' })
  });
  const result = core.evaluatePolicy(securityContext, { type: 'invoice', id: 'inv-ctx', tenantId: 'tenant-a' }, 'read');
  assert.equal(result.effect, 'allow');
  assert.equal(result.inputs.subject.userId, user.id);
  assert.equal(result.inputs.subject.tenantId, 'tenant-a');
  assert.deepEqual(result.inputs.subject.roles, ['admin']);
});


test('higher priority policy wins over lower priority policy for the same action', () => {
  const { core, user } = setup();
  core.registerPolicy({
    id: 'low-priority-deny',
    tenantId: 'tenant-a',
    name: 'low-priority-deny',
    priority: 10,
    rules: [{
      subject: { roles: ['admin'] },
      resource: { type: 'invoice', tenantScoped: true },
      action: 'read',
      effect: 'deny',
      reason: 'LOW_PRIORITY_DENY'
    }]
  });
  core.registerPolicy({
    id: 'high-priority-allow',
    tenantId: 'tenant-a',
    name: 'high-priority-allow',
    priority: 20,
    rules: [{
      subject: { roles: ['admin'] },
      resource: { type: 'invoice', tenantScoped: true },
      action: 'read',
      effect: 'allow',
      reason: 'HIGH_PRIORITY_ALLOW'
    }]
  });
  const result = core.evaluatePolicy(
    { userId: user.id, tenantId: 'tenant-a', roles: ['admin'] },
    { type: 'invoice', id: 'inv-priority', tenantId: 'tenant-a' },
    'read'
  );
  assert.equal(result.effect, 'allow');
  assert.equal(result.policyId, 'high-priority-allow');
});
