import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, ForbiddenError, UnauthorizedError } from '../public/api-client.js';

const response = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: () => 'application/json' },
  json: async () => body,
});

test('builds the canonical v1 auth context URL', async () => {
  let call;
  const api = createApiClient({ fetchImpl: async (...args) => { call = args; return response(200, { context: null }); } });
  await api.getAuthContext();
  assert.equal(call[0], 'https://api.afaghx.com/v1/auth/context');
  assert.equal(call[1].headers.Authorization, undefined);
  assert.equal(call[1].credentials, 'omit');
});

test('adds Bearer authorization only when an access token is explicitly supplied', async () => {
  let call;
  const api = createApiClient({ fetchImpl: async (...args) => { call = args; return response(200, { context: {} }); } });
  await api.getAuthContext('access-token-from-host');
  assert.equal(call[1].headers.Authorization, 'Bearer access-token-from-host');
});

test('maps HTTP 401 to UnauthorizedError', async () => {
  const api = createApiClient({ fetchImpl: async () => response(401, { error: 'unauthorized' }) });
  await assert.rejects(() => api.getAuthContext('bad-token'), (error) => error instanceof UnauthorizedError && error.status === 401);
});

test('maps HTTP 403 to ForbiddenError', async () => {
  const api = createApiClient({ fetchImpl: async () => response(403, { error: 'forbidden' }) });
  await assert.rejects(() => api.getAuthContext('valid-token'), (error) => error instanceof ForbiddenError && error.status === 403);
});

test('returns the Core auth context payload on success', async () => {
  const context = { userId: 'u-1', memberships: [{ organizationId: 'org-1', roles: ['customer'] }] };
  const api = createApiClient({ fetchImpl: async () => response(200, { context }) });
  assert.deepEqual(await api.getAuthContext('valid-token'), { context });
});
