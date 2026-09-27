import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecurityBoundary } from './security-boundary.js';

test('rejects untrusted origins and sets security headers', () => {
  const boundary = createSecurityBoundary({ allowedOrigins: ['https://app.afaghx.example'] });
  const response = boundary.process({ ip: '1.2.3.4', bodyBytes: 10, headers: { origin: 'https://evil.example' } }, () => {}, () => false);
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'origin_not_allowed');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.ok(response.headers['x-request-id']);
});

test('enforces body-size limit before application handling', () => {
  const boundary = createSecurityBoundary({ maxBodyBytes: 100 });
  const response = boundary.process({ ip: '1.2.3.4', bodyBytes: 101, headers: {} }, () => {}, () => false);
  assert.equal(response.status, 413);
  assert.equal(response.body.error, 'payload_too_large');
});

test('rate limits by client key', () => {
  let clock = 1_000;
  const boundary = createSecurityBoundary({ rateLimit: { windowMs: 60_000, max: 2 }, now: () => clock });
  const request = { ip: '1.2.3.4', bodyBytes: 0, headers: {} };
  assert.equal(boundary.process(request, () => {}, () => false).status, 200);
  assert.equal(boundary.process(request, () => {}, () => false).status, 200);
  const blocked = boundary.process(request, () => {}, () => false);
  assert.equal(blocked.status, 429);
  clock += 60_001;
  assert.equal(boundary.process(request, () => {}, () => false).status, 200);
});

test('auth boundary requires bearer token and authorization is tenant-bound', () => {
  const boundary = createSecurityBoundary();
  assert.equal(boundary.authenticate({ headers: {} }, () => {}).status, 401);
  const auth = boundary.authenticate({ headers: { authorization: 'Bearer token' } }, token => {
    assert.equal(token, 'token');
    return { userId: 'u1', tenantId: 't1' };
  });
  assert.equal(auth.ok, true);
  assert.equal(boundary.authorize(auth.principal, { tenantId: 't2', permission: 'orders.read' }, () => true).status, 403);
  assert.equal(boundary.authorize(auth.principal, { tenantId: 't1', permission: 'orders.read' }, () => true).ok, true);
  assert.equal(boundary.authorize(auth.principal, { tenantId: 't1', permission: 'orders.write' }, () => false).status, 403);
});


test('Policy allow is enforced by Gateway after successful RBAC', async () => {
  const boundary = createSecurityBoundary();
  const request = {
    headers: { authorization: 'Bearer valid-token' },
    bodyBytes: 0,
    policy: {
      permission: 'domain:product:read',
      action: 'read',
      resource: { type: 'product', id: 'p1' }
    }
  };
  const response = await boundary.process(
    request,
    async () => principal,
    async (userId, tenantId, permission) => {
      assert.equal(userId, 'u1');
      assert.equal(tenantId, 't1');
      assert.equal(permission, 'domain:product:read');
      return true;
    },
    async (context, resource, action) => {
      assert.equal(context.tenant.tenantId, 't1');
      assert.equal(resource.tenantId, 't1');
      assert.equal(action, 'read');
      return Object.freeze({
        effect: 'allow',
        reason: 'ACCESS_ALLOWED',
        policyId: 'pol-allow',
        evaluatedAt: new Date().toISOString(),
        inputs: {
          subject: { userId: 'u1', roles: ['agent-admin'], tenantId: 't1' },
          resource,
          action
        }
      });
    }
  );
  assert.equal(response.status, 200);
  assert.equal(response.securityContext.policy.effect, 'allow');
  assert.equal(Object.isFrozen(response.securityContext.policy), true);
});

test('Policy deny returns 403 and is audited', async () => {
  const audit = [];
  const boundary = createSecurityBoundary({ audit: async event => audit.push(event) });
  const response = await boundary.process(
    {
      headers: { authorization: 'Bearer valid-token' },
      bodyBytes: 0,
      policy: {
        permission: 'domain:product:read',
        action: 'read',
        resource: { type: 'product', id: 'p1' }
      }
    },
    async () => principal,
    async () => true,
    async () => Object.freeze({
      effect: 'deny',
      reason: 'PRODUCT_RESTRICTED',
      policyId: 'pol-deny',
      evaluatedAt: new Date().toISOString(),
      inputs: {
        subject: { userId: 'u1', roles: ['agent-admin'], tenantId: 't1' },
        resource: { type: 'product', id: 'p1', tenantId: 't1' },
        action: 'read'
      }
    })
  );
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'POLICY_DENIED');
  assert.equal(response.body.reason, 'PRODUCT_RESTRICTED');
  assert.ok(audit.some(event => event.type === 'policy.decision' && event.effect === 'deny'));
});

test('Policy abstain is default-deny and returns 403', async () => {
  const boundary = createSecurityBoundary();
  const response = await boundary.process(
    {
      headers: { authorization: 'Bearer valid-token' },
      bodyBytes: 0,
      policy: {
        permission: 'domain:product:read',
        action: 'read',
        resource: { type: 'product', id: 'p1' }
      }
    },
    async () => principal,
    async () => true,
    async () => Object.freeze({
      effect: 'abstain',
      reason: 'NO_POLICY_MATCHED',
      policyId: null,
      evaluatedAt: new Date().toISOString(),
      inputs: {
        subject: { userId: 'u1', roles: ['agent-admin'], tenantId: 't1' },
        resource: { type: 'product', id: 'p1', tenantId: 't1' },
        action: 'read'
      }
    })
  );
  assert.equal(response.status, 403);
  assert.equal(response.body.reason, 'NO_POLICY_MATCHED');
});

test('Policy is evaluated only after RBAC succeeds', async () => {
  const boundary = createSecurityBoundary();
  let policyCalled = false;
  const response = await boundary.process(
    {
      headers: { authorization: 'Bearer valid-token' },
      bodyBytes: 0,
      policy: {
        permission: 'domain:product:read',
        action: 'read',
        resource: { type: 'product', id: 'p1' }
      }
    },
    async () => principal,
    async () => false,
    async () => {
      policyCalled = true;
      throw new Error('must_not_run');
    }
  );
  assert.equal(response.status, 403);
  assert.equal(response.body.reason, 'RBAC_DENIED');
  assert.equal(policyCalled, false);
});
