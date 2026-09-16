import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanonicalRuntime } from './runtime.js';

function makeRuntime({ searchProvider = { search: async () => ({ items: [{ id: 'p1' }], total: 1 }) }, core = {} } = {}) {
  return createCanonicalRuntime({
    core: {
      authenticateAccessToken: async token => {
        if (token !== 'valid-token') throw new Error('unauthorized');
        return { userId: 'usr_1', tenantId: 'tenant_1', sessionId: 'ses_1', roles: ['member'] };
      },
      recordLocation: async ({ context, location }) => {
        assert.equal(context.userId, 'usr_1');
        assert.equal(location.consent, true);
        return { id: 'loc_1', recorded: true, timestamp: location.timestamp, source: 'browser' };
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
