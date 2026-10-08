import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createCanonicalRuntime } from './runtime.mjs';

function start(runtime) {
  const server = runtime.createServer();
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

function request(baseUrl, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        let payload = {};
        try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: payload });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

function createTestCore() {
  return {
    async authenticateAccessToken(token) {
      if (token !== 'valid-token') throw new Error('invalid_access_token');
      return {
        userId: 'user-1',
        tenantId: 'tenant-1',
        organizationId: 'org-1',
        membershipId: 'membership-1',
        sessionId: 'session-1',
        permissions: ['domain:product:read']
      };
    },
    async authorize({ userId, tenantId }, permission, resourceTenantId) {
      return userId === 'user-1'
        && tenantId === 'tenant-1'
        && resourceTenantId === 'tenant-1'
        && permission === 'domain:product:read';
    }
  };
}

test('G01-11: protected API path rejects missing bearer authentication', async () => {
  const runtime = createCanonicalRuntime({ core: createTestCore(), allowedOrigins: ['https://www.afaghx.com'] });
  const { server, baseUrl } = await start(runtime);
  try {
    const response = await request(baseUrl, '/v1/auth/context');
    assert.equal(response.status, 401);
    assert.equal(response.body.error, 'missing_or_invalid_bearer_token');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('G01-11: protected API path validates bearer token and returns immutable security context', async () => {
  const runtime = createCanonicalRuntime({ core: createTestCore(), allowedOrigins: ['https://www.afaghx.com'] });
  const { server, baseUrl } = await start(runtime);
  try {
    const response = await request(baseUrl, '/v1/auth/context', {
      headers: { Authorization: 'Bearer valid-token' }
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.userId, 'user-1');
    assert.equal(response.body.tenantId, 'tenant-1');
    assert.equal(response.body.organizationId, 'org-1');
    assert.equal(response.body.sessionId, 'session-1');
    assert.deepEqual(response.body.permissions, ['domain:product:read']);
    assert.equal(response.body.token, undefined);
    assert.equal(response.body.accessToken, undefined);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('G01-11: invalid bearer token is rejected before protected handler execution', async () => {
  let authorizeCalls = 0;
  const core = {
    ...createTestCore(),
    async authorize() {
      authorizeCalls += 1;
      return true;
    }
  };
  const runtime = createCanonicalRuntime({ core, allowedOrigins: ['https://www.afaghx.com'] });
  const { server, baseUrl } = await start(runtime);
  try {
    const response = await request(baseUrl, '/v1/auth/context', {
      headers: { Authorization: 'Bearer invalid-token' }
    });
    assert.equal(response.status, 401);
    assert.equal(response.body.error, 'invalid_access_token');
    assert.equal(authorizeCalls, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
