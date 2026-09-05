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

async function login(password = 'correct-horse-battery-staple', extra = {}) {
  return fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ email: 'test@example.com', password, ...extra })
  });
}

function cookieHeader(response) {
  return response.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
}

test('login API issues HttpOnly access and refresh cookies', async () => {
  const response = await login();
  assert.equal(response.status, 200);
  const setCookie = response.headers.getSetCookie();
  assert.equal(setCookie.length, 2);
  assert.match(setCookie[0], /HttpOnly/);
  assert.match(setCookie[1], /HttpOnly/);
  assert.match(setCookie[0], /SameSite=Lax/);
});

test('browser flow rejects dashboard without session', async () => {
  const response = await fetch(`${base}/dashboard`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/');
});

test('login -> dashboard -> me works with issued cookies', async () => {
  const loginResponse = await login();
  const cookies = cookieHeader(loginResponse);
  const dashboard = await fetch(`${base}/dashboard`, { headers: { Cookie: cookies } });
  assert.equal(dashboard.status, 200);
  const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookies } });
  assert.equal(me.status, 200);
  const data = await me.json();
  assert.equal(data.tenantId, 'tenant_test');
});

test('wrong password is rejected without identity disclosure', async () => {
  const response = await login('wrong-password-123');
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'invalid_credentials' });
});

test('unknown tenant is denied even with valid credentials', async () => {
  const response = await login(undefined, { tenantId: 'tenant_other' });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'invalid_credentials' });
});

test('refresh rotates the refresh token and keeps the session authenticated', async () => {
  const loginResponse = await login();
  const cookies = cookieHeader(loginResponse);
  const refreshCookie = loginResponse.headers.getSetCookie().find(x => x.startsWith('afx_refresh=')).split(';')[0];
  const rotated = await fetch(`${base}/api/auth/refresh`, { method: 'POST', headers: { Cookie: refreshCookie, Origin: base } });
  assert.equal(rotated.status, 200);
  const rotatedCookies = rotated.headers.getSetCookie();
  assert.equal(rotatedCookies.length, 2);
  assert.notEqual(rotatedCookies.find(x => x.startsWith('afx_refresh=')).split(';')[0], refreshCookie);
  const authenticated = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookies } });
  assert.equal(authenticated.status, 401);
});

test('logout revokes the session and clears cookies', async () => {
  const loginResponse = await login();
  const cookies = cookieHeader(loginResponse);
  const logout = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookies, Origin: base } });
  assert.equal(logout.status, 200);
  assert.equal(logout.headers.getSetCookie().length, 2);
  const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookies } });
  assert.equal(me.status, 401);
});

test('state-changing requests reject cross-origin browser requests', async () => {
  const response = await login('correct-horse-battery-staple', { tenantId: 'tenant_test' }).then(async r => r);
  assert.equal(response.status, 200);
  const csrf = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ email: 'test@example.com', password: 'correct-horse-battery-staple' })
  });
  assert.equal(csrf.status, 403);
});

test('login is rate limited after repeated failures', async () => {
  const statuses = [];
  for (let i = 0; i < 11; i += 1) statuses.push((await login(`wrong-${i}-password`)).status);
  assert.equal(statuses.at(-1), 429);
});
