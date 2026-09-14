import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

let upstream;
let experience;
let base;

before(async () => {
  upstream = http.createServer(async (req, res) => {
    const cookies = req.headers.cookie || '';
    const origin = req.headers.origin;
    if (origin === 'https://evil.example') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'origin_not_allowed' }));
    }
    if (req.method === 'POST' && req.url === '/v1/auth/login') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': ['afx_access=test-access; Path=/; HttpOnly', 'afx_refresh=test-refresh; Path=/; HttpOnly']
      });
      return res.end(JSON.stringify({ authenticated: true }));
    }
    if (req.method === 'GET' && req.url === '/v1/auth/me') {
      const ok = cookies.includes('afx_access=');
      res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(ok ? { authenticated: true, tenantId: 'tenant_test', roles: ['member'], userId: 'user_test' } : { error: 'unauthorized' }));
    }
    if (req.method === 'POST' && req.url === '/v1/auth/refresh') {
      const ok = cookies.includes('afx_refresh=');
      res.writeHead(ok ? 200 : 401, {
        'Content-Type': 'application/json',
        ...(ok ? { 'Set-Cookie': ['afx_access=rotated-access; Path=/; HttpOnly', 'afx_refresh=rotated-refresh; Path=/; HttpOnly'] } : {})
      });
      return res.end(JSON.stringify(ok ? { authenticated: true } : { error: 'invalid_refresh_token' }));
    }
    if (req.method === 'POST' && req.url === '/v1/auth/logout') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': ['afx_access=; Path=/; HttpOnly; Max-Age=0', 'afx_refresh=; Path=/; HttpOnly; Max-Age=0']
      });
      return res.end(JSON.stringify({ authenticated: false }));
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  process.env.AFAGHX_API_ORIGIN = `http://127.0.0.1:${upstream.address().port}`;

  const { createServer } = await import(`../server.js?auth-flow=${Date.now()}`);
  experience = createServer();
  await new Promise(resolve => experience.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${experience.address().port}`;
});

after(async () => {
  await new Promise(resolve => experience.close(resolve));
  await new Promise(resolve => upstream.close(resolve));
});

test('login proxy preserves canonical Set-Cookie responses', async () => {
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ email: 'test@example.com', password: 'correct-horse-battery-staple' })
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.match(response.headers.getSetCookie()[0], /HttpOnly/);
});

test('dashboard authorization is backed by canonical session state', async () => {
  const anonymous = await fetch(`${base}/dashboard`, { redirect: 'manual' });
  assert.equal(anonymous.status, 302);

  const authenticated = await fetch(`${base}/dashboard`, { headers: { Cookie: 'afx_access=test-access' } });
  assert.equal(authenticated.status, 200);
});

test('refresh and logout remain canonical API operations', async () => {
  const refresh = await fetch(`${base}/api/auth/refresh`, { method: 'POST', headers: { Cookie: 'afx_refresh=test-refresh', Origin: base } });
  assert.equal(refresh.status, 200);
  assert.equal(refresh.headers.getSetCookie().length, 2);

  const logout = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Cookie: 'afx_access=test-access', Origin: base } });
  assert.equal(logout.status, 200);
  assert.equal(logout.headers.getSetCookie().length, 2);
});

test('cross-origin state changes are rejected at the experience boundary', async () => {
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ email: 'test@example.com', password: 'correct-horse-battery-staple' })
  });
  assert.equal(response.status, 403);
});