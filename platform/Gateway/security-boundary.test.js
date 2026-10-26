import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecurityBoundary, SECURITY_VISIBILITY } from './security-boundary.js';

const request = {
  ip: '1.2.3.4',
  bodyBytes: 10,
  headers: {},
  requestId: 'req-test'
};
const authenticatedRequest = {
  ...request,
  headers: { authorization: 'Bearer valid-token-123456789' }
};
const invalidTokenRequest = {
  ...request,
  headers: { authorization: 'Bearer invalid-token-123456789' }
};

test('rejects untrusted origins and sets security headers', async () => {
  const boundary = createSecurityBoundary({ allowedOrigins: ['https://app.afaghx.example'] });
  const response = await boundary.process(
    { ...request, headers: { origin: 'https://evil.example' } },
    { authenticateAccessToken: async () => { throw new Error('must_not_run'); } },
    { visibility: SECURITY_VISIBILITY.PROTECTED }
  );
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'origin_not_allowed');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.equal(response.headers['x-request-id'], 'req-test');
});

test('enforces body-size limit before application handling', async () => {
  const boundary = createSecurityBoundary({ maxBodyBytes: 100 });
  const response = await boundary.process(
    { ...request, bodyBytes: 101 },
    { authenticateAccessToken: async () => { throw new Error('must_not_run'); } },
    { visibility: SECURITY_VISIBILITY.PROTECTED }
  );
  assert.equal(response.status, 413);
  assert.equal(response.body.error, 'payload_too_large');
});

test('rate limits by client key', async () => {
  let clock = 1_000;
  const boundary = createSecurityBoundary({ rateLimit: { windowMs: 60_000, max: 2 }, now: () => clock });
  const deps = { authenticateAccessToken: async () => ({ userId: 'u1', tenantId: 't1', roles: [] }) };
  const policy = { visibility: SECURITY_VISIBILITY.PROTECTED };
  assert.equal((await boundary.process(authenticatedRequest, deps, policy)).status, 200);
  assert.equal((await boundary.process(authenticatedRequest, deps, policy)).status, 200);
  const blocked = await boundary.process(authenticatedRequest, deps, policy);
  assert.equal(blocked.status, 429);
  clock += 60_001;
  assert.equal((await boundary.process(authenticatedRequest, deps, policy)).status, 200);
});

test('public routes bypass authentication and produce no security context', async () => {
  let authCalls = 0;
  const response = await createSecurityBoundary().process(
    request,
    {
      authenticateAccessToken: async () => { authCalls += 1; throw new Error('must_not_run'); },
      authorizeAccess: async () => { throw new Error('must_not_run'); }
    },
    { visibility: SECURITY_VISIBILITY.PUBLIC }
  );
  assert.equal(response.status, 200);
  assert.equal(response.securityContext, null);
  assert.equal(authCalls, 0);
});

test('protected request rejects missing bearer token', async () => {
  const response = await createSecurityBoundary().process(
    request,
    { authenticateAccessToken: async () => ({ userId: 'u1', tenantId: 't1', roles: [] }) },
    { visibility: SECURITY_VISIBILITY.PROTECTED }
  );
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'missing_or_invalid_bearer_token');
});

test('invalid token fails closed with 401', async () => {
  let authCalls = 0;
  const response = await createSecurityBoundary().process(
    invalidTokenRequest,
    {
      authenticateAccessToken: async token => {
        authCalls += 1;
        assert.equal(token, 'invalid-token-123456789');
        throw new Error('unauthorized');
      }
    },
    { visibility: SECURITY_VISIBILITY.PROTECTED }
  );
  assert.equal(authCalls, 1);
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'invalid_access_token');
});

test('authorization rejects a resource tenant that differs from SecurityContext tenant', async () => {
  const boundary = createSecurityBoundary();
  const securityContext = Object.freeze({
    version: 'AFX-SECURITY-CONTEXT-001',
    userId: 'u1',
    tenantId: 'tenant-a',
    sessionId: 's1',
    roles: Object.freeze([])
  });
  const response = await boundary.authorize(
    securityContext,
    { tenantId: 'tenant-b', permission: 'orders.read' },
    async () => true
  );
  assert.equal(response.status, 403);
  assert.equal(response.code, 'tenant_context_denied');
});

test('valid token + missing permission returns 403', async () => {
  let authorizationInput;
  const response = await createSecurityBoundary().process(
    authenticatedRequest,
    {
      authenticateAccessToken: async () => ({ userId: 'u1', tenantId: 'tenant-a', roles: [] }),
      authorizeAccess: async (userId, tenantId, permission) => {
        authorizationInput = { userId, tenantId, permission };
        return false;
      }
    },
    { visibility: SECURITY_VISIBILITY.PROTECTED, requiredPermission: 'orders.write' }
  );
  assert.equal(response.status, 403);
  assert.deepEqual(authorizationInput, {
    userId: 'u1',
    tenantId: 'tenant-a',
    permission: 'orders.write'
  });
});

test('valid token + correct tenant + permission passes and yields immutable SecurityContext', async () => {
  let authorizeCalls = 0;
  const response = await createSecurityBoundary().process(
    authenticatedRequest,
    {
      authenticateAccessToken: async () => ({ userId: 'u1', tenantId: 'tenant-a', sessionId: 's1', roles: ['agent-admin'] }),
      authorizeAccess: async (userId, tenantId, permission) => {
        authorizeCalls += 1;
        assert.equal(userId, 'u1');
        assert.equal(tenantId, 'tenant-a');
        assert.equal(permission, 'orders.read');
        return true;
      }
    },
    { visibility: SECURITY_VISIBILITY.PROTECTED, requiredPermission: 'orders.read' }
  );
  assert.equal(response.status, 200);
  assert.equal(authorizeCalls, 1);
  assert.equal(response.securityContext.version, 'AFX-SECURITY-CONTEXT-001');
  assert.equal(Object.isFrozen(response.securityContext), true);
  assert.equal(Object.isFrozen(response.securityContext.roles), true);
});

test('authentication callback failure fails closed', async () => {
  const response = await createSecurityBoundary().process(
    authenticatedRequest,
    { authenticateAccessToken: async () => { throw new Error('db_down'); } },
    { visibility: SECURITY_VISIBILITY.PROTECTED }
  );
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'invalid_access_token');
});

test('authorization callback failure fails closed', async () => {
  const response = await createSecurityBoundary().process(
    authenticatedRequest,
    {
      authenticateAccessToken: async () => ({ userId: 'u1', tenantId: 'tenant-a', roles: [] }),
      authorizeAccess: async () => { throw new Error('policy_down'); }
    },
    { visibility: SECURITY_VISIBILITY.PROTECTED, requiredPermission: 'orders.read' }
  );
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'forbidden');
});

test('security context construction failure fails closed', async () => {
  const response = await createSecurityBoundary().process(
    authenticatedRequest,
    {
      authenticateAccessToken: async () => ({ tenantId: 'tenant-a' }),
    },
    { visibility: SECURITY_VISIBILITY.PROTECTED }
  );
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'invalid_access_token');
});

test('callback execution is observable: both auth and authorization are invoked exactly once', async () => {
  let authCalls = 0;
  let authorizeCalls = 0;
  const response = await createSecurityBoundary().process(
    authenticatedRequest,
    {
      authenticateAccessToken: async () => {
        authCalls += 1;
        return { userId: 'u1', tenantId: 'tenant-a', roles: [] };
      },
      authorizeAccess: async () => {
        authorizeCalls += 1;
        return true;
      }
    },
    { visibility: SECURITY_VISIBILITY.PROTECTED, requiredPermission: 'orders.read' }
  );
  assert.equal(response.status, 200);
  assert.equal(authCalls, 1);
  assert.equal(authorizeCalls, 1);
});

test('auth endpoints use dedicated stricter rate-limit scopes', async () => {
  let clock = 1000;
  const boundary = createSecurityBoundary({
    authRateLimits: {
      login: { windowMs: 60_000, max: 2 },
      refresh: { windowMs: 60_000, max: 2 }
    },
    now: () => clock
  });
  const deps = { authenticateAccessToken: async () => ({ userId: 'u1', tenantId: 't1', roles: [] }) };
  const loginPolicy = { visibility: SECURITY_VISIBILITY.PUBLIC, rateLimitScope: 'login' };
  assert.equal((await boundary.process(request, deps, loginPolicy)).status, 200);
  assert.equal((await boundary.process(request, deps, loginPolicy)).status, 200);
  assert.equal((await boundary.process(request, deps, loginPolicy)).status, 429);
  assert.equal((await boundary.process({ ...request, ip: '5.6.7.8' }, deps, loginPolicy)).status, 200);
  clock += 60_001;
  assert.equal((await boundary.process(request, deps, loginPolicy)).status, 200);
});
