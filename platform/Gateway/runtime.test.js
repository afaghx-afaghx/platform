import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanonicalRuntime } from './runtime.js';

function makeRuntime({ searchProvider = { search: async () => ({ items: [{ id: 'p1' }], total: 1 }) }, core = {} } = {}) {
  return createCanonicalRuntime({
    core: {
      authenticatePassword: async ({ email, password, tenantId }) => {
        assert.equal(email, 'user@example.com');
        assert.equal(password, 'correct-password');
        assert.equal(tenantId, 'tenant_1');
        return { accessToken: 'valid-token', refreshToken: 'refresh-1', tokenType: 'Bearer', expiresIn: 300, sessionId: 'ses_1' };
      },
      authenticateAccessToken: async token => {
        if (token !== 'valid-token') throw new Error('unauthorized');
        return { userId: 'usr_1', tenantId: 'tenant_1', sessionId: 'ses_1', roles: ['member'] };
      },
      refresh: async token => {
        assert.equal(token, 'refresh-1');
        return { accessToken: 'valid-token-2', refreshToken: 'refresh-2', tokenType: 'Bearer', expiresIn: 300, sessionId: 'ses_1' };
      },
      revokeSession: async sessionId => assert.equal(sessionId, 'ses_1'),
      recordLocation: async ({ context, location }) => {
        assert.equal(context.userId, 'usr_1');
        assert.equal(location.consent, true);
        return { id: 'loc_1', recorded: true, timestamp: location.timestamp, source: 'browser' };
      },
      listLocationEvents: async ({ context, sessionId, limit }) => {
        assert.equal(context.tenantId, 'tenant_1');
        assert.equal(context.userId, 'usr_1');
        assert.equal(sessionId, 'ses_1');
        assert.equal(limit, 10);
        return [{ id: 'loc_1', latitude: 40, longitude: 49, timestamp: 1750000000000, source: 'browser' }];
      },
      ...core,
    },
    searchProvider,
  });
}

test('Search contract returns canonical response', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({ method: 'GET', url: '/v1/search?q=steel&category=products&page=2&limit=10', headers: {} });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.items, [{ id: 'p1' }]);
  assert.equal(result.body.page, 2);
  assert.equal(result.body.limit, 10);
  assert.equal(result.body.query, 'steel');
});

test('Search rejects invalid query', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({ method: 'GET', url: '/v1/search?q=&limit=10', headers: {} });
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'invalid_query');
});

test('Search returns 503 when provider is unavailable', async () => {
  const runtime = makeRuntime({ searchProvider: { search: async () => { throw new Error('down'); } } });
  const result = await runtime.handle({ method: 'GET', url: '/v1/search?q=steel', headers: {} });
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'search_unavailable');
});

test('Login uses AFX-CORE and returns token artifacts', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({
    method: 'POST',
    url: '/v1/auth/login',
    headers: { 'content-type': 'application/json', 'content-length': '74' },
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify({ email: 'user@example.com', password: 'correct-password', tenantId: 'tenant_1' }));
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.accessToken, 'valid-token');
  assert.equal(result.body.refreshToken, 'refresh-1');
});

test('Auth context returns 401 without credentials', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({ method: 'GET', url: '/v1/auth/context', headers: {} });
  assert.equal(result.status, 401);
});

test('Auth context returns 200 for canonical authenticated principal', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({ method: 'GET', url: '/v1/auth/context', headers: { authorization: 'Bearer valid-token' } });
  assert.equal(result.status, 200);
  assert.equal(result.body.userId, 'usr_1');
  assert.equal(result.body.tenantId, 'tenant_1');
});

test('Auth context returns 403 for a different tenant context', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({ method: 'GET', url: '/v1/auth/context?tenantId=tenant_2', headers: { authorization: 'Bearer valid-token' } });
  assert.equal(result.status, 403);
  assert.equal(result.body.error, 'tenant_context_denied');
});

test('Refresh rotates through AFX-CORE', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({
    method: 'POST',
    url: '/v1/auth/refresh',
    headers: { 'content-type': 'application/json' },
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify({ refreshToken: 'refresh-1' }));
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.accessToken, 'valid-token-2');
  assert.equal(result.body.refreshToken, 'refresh-2');
});

test('Logout revokes the canonical session', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({ method: 'POST', url: '/v1/auth/logout', headers: { authorization: 'Bearer valid-token' } });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { authenticated: false });
});

test('Location requires bearer authentication', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({ method: 'POST', url: '/v1/location', headers: {} });
  assert.equal(result.status, 401);
});

test('Location passes authenticated context to PersistentAfxCore', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({
    method: 'POST',
    url: '/v1/location',
    headers: { authorization: 'Bearer valid-token' },
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify({ latitude: 40, longitude: 49, accuracy: 10, timestamp: 1750000000000, source: 'browser', purpose: 'session', consent: true }));
    },
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.source, 'browser');
  assert.equal(result.body.recorded, true);
  assert.equal(result.body.latitude, undefined);
  assert.equal(result.body.longitude, undefined);
});

test('Location history is tenant-scoped and exposes only coarse coordinates', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({ method: 'GET', url: '/v1/location?sessionId=ses_1&limit=10', headers: { authorization: 'Bearer valid-token' } });
  assert.equal(result.status, 200);
  assert.equal(result.body.count, 1);
  assert.equal(result.body.items[0].latitude, 40);
  assert.equal(result.body.items[0].longitude, 49);
  assert.equal(result.body.items[0].exactCoordinates, undefined);
});

test('Location history rejects an invalid limit', async () => {
  const runtime = makeRuntime();
  const result = await runtime.handle({ method: 'GET', url: '/v1/location?limit=101', headers: { authorization: 'Bearer valid-token' } });
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'invalid_limit');
});
