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
  const response = await boundary.process(
    { ip: '1.2.3.4', bodyBytes: 10, headers: { origin: 'https://evil.example' } },
    async () => principal,
    async () => false
  );
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'origin_not_allowed');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.ok(response.headers['x-request-id']);
});

test('enforces body-size limit before application handling', async () => {
  const boundary = createSecurityBoundary({ maxBodyBytes: 100 });
  const response = await boundary.process(
    { ip: '1.2.3.4', bodyBytes: 101, headers: {} },
    async () => principal,
    async () => false,
    { requiresAuthentication: false }
  );
  assert.equal(response.status, 413);
  assert.equal(response.body.error, 'payload_too_large');
});

test('rate limits by client key for public routes', async () => {
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

test('missing Authorization is rejected with 401', async () => {
  const boundary = createSecurityBoundary();
  const response = await boundary.process({ headers: {}, bodyBytes: 0 }, async () => principal, async () => true);
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'missing_or_invalid_bearer_token');
});

test('fake token is rejected with 401', async () => {
  const boundary = createSecurityBoundary();
  const response = await boundary.process(
    { headers: { authorization: 'Bearer fake-token-that-will-fail' }, bodyBytes: 0 },
    async token => {
      assert.equal(token, 'fake-token-that-will-fail');
      throw new Error('unauthorized');
    },
    async () => true
  );
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'invalid_access_token');
});

test('expired token is rejected with 401 by the Core callback', async () => {
  const boundary = createSecurityBoundary();
  const response = await boundary.process(
    { headers: { authorization: 'Bearer expired-token-that-will-fail' }, bodyBytes: 0 },
    async () => {
      throw new Error('unauthorized');
    },
    async () => true
  );
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'invalid_access_token');
});

test('query tenantId is ignored and audited; session tenant remains authoritative', async () => {
  const audit = [];
  const boundary = createSecurityBoundary({ audit: async event => audit.push(event) });
  const request = {
    headers: { authorization: 'Bearer valid-token' },
    queryTenantId: 'evil-tenant',
    bodyBytes: 0
  };
  const response = await boundary.process(request, async () => principal, async () => true);
  assert.equal(response.status, 200);
  assert.equal(response.securityContext.tenant.tenantId, 't1');
  assert.equal(audit.length, 1);
  assert.equal(audit[0].type, 'security.tenant_request_ignored');
  assert.equal(audit[0].source, 'query');
  assert.equal(audit[0].actualTenantId, 't1');
});

test('header tenantId is ignored and audited; session tenant remains authoritative', async () => {
  const audit = [];
  const boundary = createSecurityBoundary({ audit: async event => audit.push(event) });
  const request = {
    headers: { authorization: 'Bearer valid-token', 'x-tenant-id': 'evil-tenant' },
    bodyBytes: 0
  };
  const response = await boundary.process(request, async () => principal, async () => true);
  assert.equal(response.status, 200);
  assert.equal(response.securityContext.tenant.tenantId, 't1');
  assert.equal(audit.length, 1);
  assert.equal(audit[0].source, 'header');
});

test('buildSecurityContext is deeply immutable and records current Core contract gaps explicitly', () => {
  const context = buildSecurityContext({ principal, requestId: 'req-1' });
  assert.equal(context.authn.method, 'session');
  assert.equal(context.authn.sessionId, 's1');
  assert.equal(context.authn.authenticatedAt, null);
  assert.equal(context.authn.expiresAt, null);
  assert.equal(context.identity.email, undefined);
  assert.equal(context.rbac.evaluatedAt, null);
  assert.equal(context.policy, null);
  assert.equal(Object.isFrozen(context), true);
  assert.equal(Object.isFrozen(context.membership), true);
  assert.equal(Object.isFrozen(context.membership.roles), true);
  assert.equal(Object.isFrozen(context.trace), true);

  assert.throws(() => { context.tenant.tenantId = 't2'; }, TypeError);
  assert.throws(() => { context.membership.roles.push('root'); }, TypeError);
});

test('process propagates an immutable SecurityContext onto the request', async () => {
  const boundary = createSecurityBoundary();
  const request = { headers: { authorization: 'Bearer valid-token' }, bodyBytes: 0 };
  const response = await boundary.process(request, async () => principal, async () => true);
  assert.equal(response.status, 200);
  assert.equal(request.securityContext, response.securityContext);
  assert.equal(Object.getOwnPropertyDescriptor(request, 'securityContext').writable, false);
  assert.equal(request.securityContext.tenant.resolvedFrom, 'session');
});

test('tenant mismatch is denied by the Gateway authorization helper', async () => {
  const boundary = createSecurityBoundary();
  const response = await boundary.authorize(
    principal,
    { tenantId: 't2', permission: 'orders.read' },
    async () => true
  );
  assert.equal(response.status, 403);
  assert.equal(response.code, 'tenant_context_denied');
});

test('RBAC deny is preserved as 403 by the Gateway authorization helper', async () => {
  const boundary = createSecurityBoundary();
  const response = await boundary.authorize(
    principal,
    { tenantId: 't1', permission: 'orders.write' },
    async () => false
  );
  assert.equal(response.status, 403);
  assert.equal(response.code, 'forbidden');
});

test('public route can pass the Gateway pre-flight without a SecurityContext', async () => {
  const boundary = createSecurityBoundary();
  const response = await boundary.process(
    { headers: {}, bodyBytes: 0 },
    async () => principal,
    async () => true,
    { requiresAuthentication: false }
  );
  assert.equal(response.status, 200);
  assert.equal(response.securityContext, undefined);
});
