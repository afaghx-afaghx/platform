import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

let upstream;
let experience;
let base;

before(async () => {
  upstream = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/v1/auth/me') {
      const ok = (req.headers.cookie || '').includes('afx_access=');
      res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(ok ? { authenticated: true } : { error: 'unauthorized' }));
    }
    if (req.method === 'GET' && req.url === '/v1/probe') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ canonical: true }));
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  process.env.AFAGHX_API_ORIGIN = `http://127.0.0.1:${upstream.address().port}`;

  const { createServer } = await import('../server.js');
  experience = createServer();
  await new Promise(resolve => experience.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${experience.address().port}`;
});

after(async () => {
  await new Promise(resolve => experience.close(resolve));
  await new Promise(resolve => upstream.close(resolve));
});

test('API proxy reaches canonical /v1 surface', async () => {
  const response = await fetch(`${base}/api/probe`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { canonical: true });
});

test('dashboard redirects without canonical session', async () => {
  const response = await fetch(`${base}/dashboard`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/');
});

test('dashboard accepts a session only when canonical API accepts it', async () => {
  const response = await fetch(`${base}/dashboard`, { headers: { Cookie: 'afx_access=canonical-test-token' } });
  assert.equal(response.status, 200);
});
