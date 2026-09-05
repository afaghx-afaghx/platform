import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.AFAGHX_BOOTSTRAP_EMAIL ||= 'test@example.com';
process.env.AFAGHX_BOOTSTRAP_PASSWORD ||= 'correct-horse-battery-staple';
process.env.AFAGHX_TENANT_ID ||= 'tenant_test';

const { createServer } = await import('../server.js');
let server;
let base;

before(async () => await new Promise(resolve => {
  server = createServer().listen(0, '127.0.0.1', () => {
    base = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
after(async () => await new Promise(resolve => server.close(resolve)));

test('login API issues HttpOnly access and refresh cookies', async () => {
  const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email: 'test@example.com', password: 'correct-horse-battery-staple' }) });
  assert.equal(response.status, 200);
  const setCookie = response.headers.getSetCookie();
  assert.equal(setCookie.length, 2);
  assert.match(setCookie[0], /HttpOnly/);
  assert.match(setCookie[1], /HttpOnly/);
});

test('browser flow rejects dashboard without session', async () => {
  const response = await fetch(`${base}/dashboard`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/');
});

test('login -> dashboard -> me works with issued cookies', async () => {
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email: 'test@example.com', password: 'correct-horse-battery-staple' }) });
  const cookies = login.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
  const dashboard = await fetch(`${base}/dashboard`, { headers: { Cookie: cookies } });
  assert.equal(dashboard.status, 200);
  const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookies } });
  assert.equal(me.status, 200);
  const data = await me.json();
  assert.equal(data.tenantId, 'tenant_test');
});

test('wrong password is rejected', async () => {
  const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email: 'test@example.com', password: 'wrong-password-123' }) });
  assert.equal(response.status, 401);
});

test('refresh rotates the refresh token and keeps the session authenticated', async () => {
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email: 'test@example.com', password: 'correct-horse-battery-staple' }) });
  const cookies = login.headers.getSetCookie().map(x => x.split(';')[0]);
  const refreshCookie = cookies.find(x => x.startsWith('afx_refresh=')).split('=')[1];
  const rotated = await fetch(`${base}/api/auth/refresh`, { method: 'POST', headers: { Cookie: `afx_refresh=${refreshCookie}`, Origin: base } });
  assert.equal(rotated.status, 200);
  const rotatedCookies = rotated.headers.getSetCookie();
  assert.equal(rotatedCookies.length, 2);
  assert.notEqual(rotatedCookies.find(x => x.startsWith('afx_refresh=')).split(';')[0], `afx_refresh=${refreshCookie}`);
});

test('state-changing requests reject cross-origin browser requests', async () => {
  const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: JSON.stringify({ email: 'test@example.com', password: 'correct-horse-battery-staple' }) });
  assert.equal(response.status, 403);
});
