import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';
import { createAfxHttpHandler } from '../src/http.js';

async function request(handler, { method = 'GET', path, headers = {}, body } = {}) {
  const chunks = [];
  const req = {
    method,
    url: path,
    headers,
    async *[Symbol.asyncIterator]() { if (body !== undefined) yield body; }
  };
  const res = {
    statusCode: null,
    headers: null,
    body: '',
    writeHead(status, responseHeaders) { this.statusCode = status; this.headers = responseHeaders; },
    end(payload = '') { this.body = payload; }
  };
  await handler(req, res);
  return { ...res, json: res.body ? JSON.parse(res.body) : null, chunks };
}

function fixture() {
  const core = new AfxCore();
  const user = core.createUser({ email: 'User@Example.com', password: 'Correct-Horse-Battery-Staple-2026' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['member'] });
  return { core, user };
}

test('health endpoint is unauthenticated and non-cacheable', async () => {
  const { core } = fixture();
  const res = await request(createAfxHttpHandler(core), { path: '/v1/health' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json.status, 'ok');
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
});

test('login authenticates credentials and never returns password material', async () => {
  const { core } = fixture();
  const res = await request(createAfxHttpHandler(core), {
    method: 'POST', path: '/v1/auth/login',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'USER@example.com', password: 'Correct-Horse-Battery-Staple-2026', tenantId: 'tenant-a' })
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json.tokenType, 'Bearer');
  assert.ok(res.json.accessToken);
  assert.ok(res.json.refreshToken);
  assert.equal('password' in res.json, false);
});

test('login normalizes credential failures to prevent tenant/account enumeration', async () => {
  const { core } = fixture();
  const handler = createAfxHttpHandler(core);
  const badPassword = await request(handler, { method: 'POST', path: '/v1/auth/login', body: JSON.stringify({ email: 'User@example.com', password: 'wrong', tenantId: 'tenant-a' }) });
  const badTenant = await request(handler, { method: 'POST', path: '/v1/auth/login', body: JSON.stringify({ email: 'User@example.com', password: 'Correct-Horse-Battery-Staple-2026', tenantId: 'tenant-b' }) });
  assert.equal(badPassword.statusCode, 401);
  assert.equal(badTenant.statusCode, 401);
  assert.equal(badPassword.json.error, 'authentication_failed');
  assert.equal(badTenant.json.error, 'authentication_failed');
});

test('protected endpoint requires a strict bearer token', async () => {
  const { core } = fixture();
  const handler = createAfxHttpHandler(core);
  for (const authorization of [undefined, 'Basic abc', 'Bearer short', 'Bearer abc.def.ghi']) {
    const headers = authorization ? { authorization } : {};
    const res = await request(handler, { path: '/v1/auth/me', headers });
    assert.equal(res.statusCode, 401);
  }
});

test('authenticated request is tenant-bound and exposes no token', async () => {
  const { core } = fixture();
  const login = core.authenticatePassword({ email: 'user@example.com', password: 'Correct-Horse-Battery-Staple-2026', tenantId: 'tenant-a' });
  const handler = createAfxHttpHandler(core);
  const res = await request(handler, { path: '/v1/auth/me', headers: { authorization: `Bearer ${login.accessToken}`, 'x-afx-tenant-id': 'tenant-a' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json.tenantId, 'tenant-a');
  assert.equal('accessToken' in res.json, false);
  assert.equal('refreshToken' in res.json, false);
});

test('cross-tenant context is denied before resource handling', async () => {
  const { core } = fixture();
  const login = core.authenticatePassword({ email: 'user@example.com', password: 'Correct-Horse-Battery-Staple-2026', tenantId: 'tenant-a' });
  const res = await request(createAfxHttpHandler(core), { path: '/v1/auth/me', headers: { authorization: `Bearer ${login.accessToken}`, 'x-afx-tenant-id': 'tenant-b' } });
  assert.equal(res.statusCode, 403);
  assert.equal(res.json.error, 'tenant_context_mismatch');
});

test('credentials supplied in query strings are rejected', async () => {
  const { core } = fixture();
  const res = await request(createAfxHttpHandler(core), { path: '/v1/auth/me?access_token=leaked' });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json.error, 'credentials_in_url_not_allowed');
});

test('logout revokes the authenticated session', async () => {
  const { core } = fixture();
  const login = core.authenticatePassword({ email: 'user@example.com', password: 'Correct-Horse-Battery-Staple-2026', tenantId: 'tenant-a' });
  const handler = createAfxHttpHandler(core);
  const logout = await request(handler, { method: 'POST', path: '/v1/auth/logout', headers: { authorization: `Bearer ${login.accessToken}` } });
  assert.equal(logout.statusCode, 204);
  const me = await request(handler, { path: '/v1/auth/me', headers: { authorization: `Bearer ${login.accessToken}` } });
  assert.equal(me.statusCode, 401);
});

test('unsupported methods are rejected with an explicit allow header', async () => {
  const { core } = fixture();
  const res = await request(createAfxHttpHandler(core), { method: 'PUT', path: '/v1/auth/me' });
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'GET, POST, OPTIONS');
});
