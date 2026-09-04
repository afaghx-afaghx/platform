import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpSecurityBoundary } from '../src/http-security-boundary.js';

function makeCore(overrides = {}) {
  return {
    authenticateAccessToken: async token => {
      if (token === 'valid-token-1234567890') return { userId: 'usr_1', tenantId: 'tenant-a', sessionId: 'ses_1', roles: ['reader'] };
      throw new Error('unauthorized');
    },
    authorize: async (context, permission, tenantId) => context.userId === 'usr_1' && permission === 'invoice.read' && tenantId === 'tenant-a',
    ...overrides
  };
}

const request = (authorization, extra = {}) => ({
  method: 'GET',
  headers: authorization === undefined ? {} : { authorization },
  ...extra
});

test('G01-11 no Authorization returns 401', async () => {
  const boundary = createHttpSecurityBoundary({ core: makeCore() });
  const response = await boundary(request(), async () => ({ status: 200 }));
  assert.deepEqual(response, { status: 401, body: { error: 'unauthorized' } });
});

test('G01-11 malformed Bearer returns 401', async () => {
  const boundary = createHttpSecurityBoundary({ core: makeCore() });
  for (const header of ['Basic abc', 'Bearer', 'Bearer a b', 'Bearer short']) {
    const response = await boundary(request(header), async () => ({ status: 200 }));
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: 'unauthorized' });
  }
});

test('G01-11 invalid, expired, or revoked tokens map to 401', async () => {
  const boundary = createHttpSecurityBoundary({ core: makeCore({ authenticateAccessToken: async () => { throw new Error('unauthorized'); } }) });
  const response = await boundary(request('Bearer invalid-token-123456789'), async () => ({ status: 200 }));
  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { error: 'unauthorized' });
});

test('G01-11 valid token authenticates before handler', async () => {
  const boundary = createHttpSecurityBoundary({ core: makeCore() });
  let seen;
  const response = await boundary(request('Bearer valid-token-1234567890'), async req => {
    seen = req.security;
    return { status: 200, body: { ok: true } };
  });
  assert.equal(response.status, 200);
  assert.deepEqual(seen, { userId: 'usr_1', tenantId: 'tenant-a', sessionId: 'ses_1', roles: ['reader'] });
});

test('G01-11 authenticated but unauthorized returns 403', async () => {
  const boundary = createHttpSecurityBoundary({ core: makeCore() });
  const response = await boundary(request('Bearer valid-token-1234567890', { requiredPermission: 'invoice.delete', resourceTenantId: 'tenant-a' }), async () => ({ status: 200 }));
  assert.deepEqual(response, { status: 403, body: { error: 'forbidden' } });
});

test('G01-11 authenticated and authorized request reaches handler', async () => {
  const boundary = createHttpSecurityBoundary({ core: makeCore() });
  const response = await boundary(request('Bearer valid-token-1234567890', { requiredPermission: 'invoice.read', resourceTenantId: 'tenant-a' }), async req => ({ status: 200, body: req.security.userId }));
  assert.deepEqual(response, { status: 200, body: 'usr_1' });
});

test('G01-11 rejects malformed protocol, content type, and oversized input', async () => {
  const boundary = createHttpSecurityBoundary({ core: makeCore(), maxRequestBytes: 100 });
  const cases = [
    request('Bearer valid-token-1234567890', { method: 'TRACE' }),
    request('Bearer valid-token-1234567890', { headers: { authorization: 'Bearer valid-token-1234567890', 'content-type': 'text/plain' } }),
    request('Bearer valid-token-1234567890', { headers: { authorization: 'Bearer valid-token-1234567890', 'content-length': '101' } }),
    request('Bearer valid-token-1234567890', { headers: { authorization: 'Bearer valid-token-1234567890', 'content-length': 'not-a-number' } })
  ];
  for (const item of cases) {
    const response = await boundary(item, async () => ({ status: 200 }));
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: 'bad_request' });
  }
});

test('G01-11 never leaks credentials or internal errors', async () => {
  const secret = 'valid-token-1234567890';
  const boundary = createHttpSecurityBoundary({ core: makeCore(), });
  const response = await boundary(request(`Bearer ${secret}`), async () => { throw new Error(`database password=${secret}`); });
  assert.equal(response.status, 500);
  const serialized = JSON.stringify(response);
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes('database password'), false);
});
