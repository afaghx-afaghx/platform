import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createCanonicalRuntime } from './runtime.mjs';

function request(base, path, { method = 'GET', body, cookie, token } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const headers = {
      ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
      ...(cookie ? { cookie } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    };
    const req = http.request(new URL(path, base), { method, headers }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
      }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('canonical auth runtime establishes and consumes HttpOnly browser cookies', async () => {
  const sessions = new Map();
  const core = {
    async authenticatePassword() {
      const tokens = { accessToken: 'access-token-123456789012345', refreshToken: 'refresh-token-123456789012345', tokenType: 'Bearer', expiresIn: 300, sessionId: 'ses_1' };
      sessions.set(tokens.accessToken, { userId: 'usr_1', tenantId: 'tenant_1', sessionId: 'ses_1' });
      return tokens;
    },
    async authenticateAccessToken(token) {
      const context = sessions.get(token);
      if (!context) throw new Error('unauthorized');
      return context;
    },
    async refresh() {
      const tokens = { accessToken: 'access-token-rotated-123456789', refreshToken: 'refresh-token-rotated-123456789', tokenType: 'Bearer', expiresIn: 300, sessionId: 'ses_1' };
      sessions.set(tokens.accessToken, { userId: 'usr_1', tenantId: 'tenant_1', sessionId: 'ses_1' });
      return tokens;
    },
    async revokeSession() { return undefined; }
  };

  const runtime = createCanonicalRuntime({ core });
  const server = runtime.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const login = await request(base, '/v1/auth/login', { method: 'POST', body: { email: 'user@example.com', password: 'correct', tenantId: 'tenant_1' } });
    assert.equal(login.status, 200);
    assert.equal(login.headers['set-cookie'].length, 2);
    assert.match(login.headers['set-cookie'][0], /HttpOnly/);
    assert.match(login.headers['set-cookie'][0], /Secure/);
    assert.match(login.headers['set-cookie'][0], /SameSite=None/);

    const cookie = login.headers['set-cookie'].map(value => value.split(';', 1)[0]).join('; ');
    const context = await request(base, '/v1/auth/context', { cookie });
    assert.equal(context.status, 200);
    assert.equal(context.body.userId, 'usr_1');
    assert.equal(context.body.tenantId, 'tenant_1');

    const refresh = await request(base, '/v1/auth/refresh', { method: 'POST', cookie });
    assert.equal(refresh.status, 200);
    assert.equal(refresh.headers['set-cookie'].length, 2);

    const rotatedCookie = refresh.headers['set-cookie'].map(value => value.split(';', 1)[0]).join('; ');
    const rotatedContext = await request(base, '/v1/auth/context', { cookie: rotatedCookie });
    assert.equal(rotatedContext.status, 200);

    const logout = await request(base, '/v1/auth/logout', { method: 'POST', cookie: rotatedCookie });
    assert.equal(logout.status, 200);
    assert.match(logout.headers['set-cookie'][0], /Max-Age=0/);
    assert.match(logout.headers['set-cookie'][1], /Max-Age=0/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
