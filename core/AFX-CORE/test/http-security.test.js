import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAuthApi } from '../src/api.js';

const request = (server, { method = 'GET', path = '/v1/auth/context', authorization } = {}) => new Promise((resolve, reject) => {
  const { port } = server.address();
  const req = http.request({ hostname: '127.0.0.1', port, method, path, headers: authorization ? { authorization } : {} }, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) }));
  });
  req.on('error', reject);
  req.end();
});

const withServer = async (core, fn) => {
  const server = createAuthApi({ core });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { await fn(server); } finally { await new Promise((resolve) => server.close(resolve)); }
};

test('rejects missing Authorization with 401', async () => {
  await withServer({ authenticateAccessToken: async () => { throw new Error('must not run'); } }, async (server) => {
    const response = await request(server);
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: 'unauthorized' });
  });
});

test('rejects malformed Authorization with 401', async () => {
  await withServer({ authenticateAccessToken: async () => { throw new Error('must not run'); } }, async (server) => {
    const response = await request(server, { authorization: 'Basic abc' });
    assert.equal(response.status, 401);
  });
});

test('rejects invalid Bearer token with 401', async () => {
  await withServer({ authenticateAccessToken: async () => { throw new Error('unauthorized'); } }, async (server) => {
    const response = await request(server, { authorization: 'Bearer invalid-token-value' });
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: 'unauthorized' });
  });
});

test('accepts a valid Bearer token and returns sanitized auth context', async () => {
  let received;
  await withServer({ authenticateAccessToken: async (token) => { received = token; return { userId: 'usr_1', tenantId: 'tenant_1', sessionId: 'ses_1', roles: ['member'] }; } }, async (server) => {
    const response = await request(server, { authorization: 'Bearer valid-token-value-123456' });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { context: { userId: 'usr_1', tenantId: 'tenant_1', sessionId: 'ses_1', roles: ['member'] } });
    assert.equal(received, 'valid-token-value-123456');
  });
});

test('does not expose authentication on unsupported route or method', async () => {
  await withServer({ authenticateAccessToken: async () => { throw new Error('must not run'); } }, async (server) => {
    const notFound = await request(server, { path: '/v1/users' });
    assert.equal(notFound.status, 404);
    const method = await request(server, { method: 'POST' });
    assert.equal(method.status, 404);
  });
});
