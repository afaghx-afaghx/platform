import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecurityBoundary, buildSecurityContext } from './security-boundary.js';

const principal = Object.freeze({
  userId: 'u1',
  tenantId: 't1',
  sessionId: 's1',
  roles: ['agent-admin']
});

test('rejects untrusted origins and sets security headers', async () => {
  const boundary = createSecurityBoundary({ allowedOrigins: ['https://app.afaghx.example'] });
  const response = await boundary.process({ ip: '1.2.3.4', bodyBytes: 10, headers: { origin: 'https://evil.example' } }, async () => principal, async () => false);
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'origin_not_allowed');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.ok(response.headers['x-request-id']);
});

test('enforces body-size limit before application handling', async () => {
  const boundary = createSecurityBoundary({ maxBodyBytes: 100 });
  const response = await boundary.process({ ip: '1.2.3.4', bodyBytes: 101, headers: {} }, async () => principal, async () => false, { requiresAuthentication: false });
  assert.equal(response.status, 413);
  assert.equal(response.body.error, 'payload_too_large');
});

test('rate limits by client key', async () => {
  let clock = 1_000;
  const boundary = createSecurityBoundary({ rateLimit: { windowMs: 60_000, max: 2 }, now: () => clock });
  const request = { ip: '1.2.3.4', bodyBytes: 0, headers: {} };
  assert.equal((await boundary.process(request, async () => principal, async () => false, { requiresAuthentication: false })).status, 200);
  assert.equal((await boundary.process(request, async () => principal, async () => false, { requiresAuthentication: false })).status, 200);
  const blocked = await boundary.process(request, async () => principal, async () => false, { requiresAuthentication: false });
  assert.equal(blocked.status, 429);
  clock += 60_001;
  assert.equal((await boundary.process(request, async () => principal, async () => false, { requiresAuthentication: false })).status, 200);
});

test('auth boundary requires bearer token and authorization is tenant-bound', async () => {
  const boundary = createSecurityBoundary();
  assert.equal((await boundary.authenticate({ headers: {} }, async () => principal)).status, 401);
  const auth = await boundary.authenticate({ headers: { authorization: 'Bearer token' } }, async token => {
    assert.equal(token, 'token');
    return principal;
  });
  assert.equal(auth.ok, true);
  const mismatch = await boundary.process({ headers: { authorization: 'Bearer token' }, bodyBytes: 0, policy: { permission: 'orders.read', action: 'read', resource: { type: 'order', id: 'o1' } } }, async () => principal, async () => true, async () => ({ effect: 'allow', reason: 'x', policyId: 'p', evaluatedAt: new Date().toISOString(), inputs: { subject: { userId: 'u1', roles: ['agent-admin'], tenantId: 't1' }, resource: { type: 'order', id: 'o1', tenantId: 't1' }, action: 'read' } }));
  assert.equal(mismatch.status, 200);
});

test('Policy allow is enforced by Gateway after successful RBAC', async () => {
  const boundary = createSecurityBoundary();
  const request = { headers: { authorization: 'Bearer valid-token' }, bodyBytes: 0, policy: { permission: 'domain:product:read', action: 'read', resource: { type: 'product', id: 'p1' } } };
  const response = await boundary.process(request, async () => principal, async (userId, tenantId, permission) => {
    assert.equal(userId, 'u1'); assert.equal(tenantId, 't1'); assert.equal(permission, 'domain:product:read'); return true;
  }, async (context, resource, action) => {
    assert.equal(context.tenant.tenantId, 't1'); assert.equal(resource.tenantId, 't1'); assert.equal(action, 'read');
    return Object.freeze({ effect: 'allow', reason: 'ACCESS_ALLOWED', policyId: 'pol-allow', evaluatedAt: new Date().toISOString(), inputs: { subject: { userId: 'u1', roles: ['agent-admin'], tenantId: 't1' }, resource, action } });
  });
  assert.equal(response.status, 200);
  assert.equal(response.securityContext.policy.effect, 'allow');
  assert.equal(Object.isFrozen(response.securityContext.policy), true);
});

test('Policy deny returns 403 and is audited', async () => {
  const audit = [];
  const boundary = createSecurityBoundary({ audit: async event => audit.push(event) });
  const response = await boundary.process({ headers: { authorization: 'Bearer valid-token' }, bodyBytes: 0, policy: { permission: 'domain:product:read', action: 'read', resource: { type: 'product', id: 'p1' } } }, async () => principal, async () => true, async () => Object.freeze({ effect: 'deny', reason: 'PRODUCT_RESTRICTED', policyId: 'pol-deny', evaluatedAt: new Date().toISOString(), inputs: { subject: { userId: 'u1', roles: ['agent-admin'], tenantId: 't1' }, resource: { type: 'product', id: 'p1', tenantId: 't1' }, action: 'read' } }));
  assert.equal(response.status, 403); assert.equal(response.body.error, 'POLICY_DENIED'); assert.equal(response.body.reason, 'PRODUCT_RESTRICTED');
  assert.ok(audit.some(event => event.type === 'policy.decision' && event.effect === 'deny'));
});

test('Policy abstain is default-deny and returns 403', async () => {
  const boundary = createSecurityBoundary();
  const response = await boundary.process({ headers: { authorization: 'Bearer valid-token' }, bodyBytes: 0, policy: { permission: 'domain:product:read', action: 'read', resource: { type: 'product', id: 'p1' } } }, async () => principal, async () => true, async () => Object.freeze({ effect: 'abstain', reason: 'NO_POLICY_MATCHED', policyId: null, evaluatedAt: new Date().toISOString(), inputs: { subject: { userId: 'u1', roles: ['agent-admin'], tenantId: 't1' }, resource: { type: 'product', id: 'p1', tenantId: 't1' }, action: 'read' } }));
  assert.equal(response.status, 403); assert.equal(response.body.reason, 'NO_POLICY_MATCHED');
});

test('Policy is evaluated only after RBAC succeeds', async () => {
  const boundary = createSecurityBoundary(); let policyCalled = false;
  const response = await boundary.process({ headers: { authorization: 'Bearer valid-token' }, bodyBytes: 0, policy: { permission: 'domain:product:read', action: 'read', resource: { type: 'product', id: 'p1' } } }, async () => principal, async () => false, async () => { policyCalled = true; throw new Error('must_not_run'); });
  assert.equal(response.status, 403); assert.equal(response.body.reason, 'RBAC_DENIED'); assert.equal(policyCalled, false);
});

test('SecurityContext policy is immutable after evaluation', async () => {
  const response = await createSecurityBoundary().process({ headers: { authorization: 'Bearer valid-token' }, bodyBytes: 0, policy: { permission: 'domain:product:read', action: 'read', resource: { type: 'product', id: 'p1' } } }, async () => principal, async () => true, async () => ({ effect: 'allow', reason: 'ACCESS_ALLOWED', policyId: null, evaluatedAt: new Date().toISOString(), inputs: { subject: { userId: 'u1', roles: ['agent-admin'], tenantId: 't1' }, resource: { type: 'product', id: 'p1', tenantId: 't1' }, action: 'read' } }));
  assert.equal(response.status, 200);
  assert.equal(Object.isFrozen(response.securityContext), true);
  assert.equal(Object.isFrozen(response.securityContext.policy), true);
});

test('Gateway hydrates Identity and RBAC aggregates from Core', async () => {
  const boundary = createSecurityBoundary();
  const response = await boundary.process(
    { headers: { authorization: 'Bearer valid-token' }, bodyBytes: 0 },
    async () => principal,
    async () => true,
    async () => Object.freeze({
      effect: 'allow',
      reason: 'ACCESS_ALLOWED',
      policyId: 'p',
      evaluatedAt: new Date().toISOString(),
      inputs: {
        subject: { userId: 'u1', roles: ['agent-admin'], tenantId: 't1' },
        resource: { type: 'search', id: null, tenantId: 't1' },
        action: 'read'
      }
    }),
    {
      resolveIdentity: async userId => ({ userId, email: 'u1@example.com', status: 'active' }),
      resolveMembershipAggregate: async (userId, tenantId) => ({
        userId,
        tenantId,
        roles: ['agent-admin'],
        permissions: ['search.read'],
        status: 'active'
      })
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.securityContext.identity.email, 'u1@example.com');
  assert.equal(response.securityContext.identity.status, 'active');
  assert.deepEqual(response.securityContext.membership.permissions, ['search.read']);
  assert.deepEqual(response.securityContext.rbac.permissions, ['search.read']);
  assert.equal(Object.isFrozen(response.securityContext.membership.permissions), true);
  assert.equal(Object.isFrozen(response.securityContext.rbac.permissions), true);
});

test('Gateway fails closed when Core aggregate resolution fails', async () => {
  const boundary = createSecurityBoundary();
  const response = await boundary.process(
    { headers: { authorization: 'Bearer valid-token' }, bodyBytes: 0 },
    async () => principal,
    async () => true,
    async () => { throw new Error('must_not_run'); },
    {
      resolveIdentity: async () => { throw new Error('identity_unavailable'); }
    }
  );
  assert.equal(response.status, 500);
  assert.equal(response.body.error, 'security_context_resolution_failed');
});


test('authentication abuse limiter blocks repeated login/refresh buckets', async () => {
  let clock = 1_000;
  const boundary = createSecurityBoundary({
    authRateLimit: { windowMs: 60_000, max: 2 },
    now: () => clock
  });
  const request = { ip: '1.2.3.4', bodyBytes: 0, headers: {}, authRateLimitKey: 'auth:1.2.3.4' };
  assert.equal((await boundary.process(request, async () => principal, async () => false, { requiresAuthentication: false })).status, 200);
  assert.equal((await boundary.process(request, async () => principal, async () => false, { requiresAuthentication: false })).status, 200);
  const blocked = await boundary.process(request, async () => principal, async () => false, { requiresAuthentication: false });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error, 'auth_rate_limited');
  clock += 60_001;
  assert.equal((await boundary.process(request, async () => principal, async () => false, { requiresAuthentication: false })).status, 200);
});
