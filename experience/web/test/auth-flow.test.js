import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

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

test('experience shell serves the presentation layer', async () => {
  const response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /AFAGHX|یک اکوسیستم/);
});

test('experience hub exposes the five canonical role journeys', async () => {
  const response = await fetch(`${base}/roles.html`);
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const role of ['Customer', 'Business', 'Supplier', 'Factory', 'Partner']) assert.match(html, new RegExp(role));
  assert.match(html, /Canonical API/);
  assert.doesNotMatch(html, /password|access[_-]?token/i);
});

test('experience shell never owns authentication APIs', async () => {
  const response = await fetch(`${base}/api/auth/me`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'canonical_api_only' });
});

test('experience shell does not expose credentials or an in-memory auth bootstrap', async () => {
  const response = await fetch(`${base}/server.js`);
  assert.equal(response.status, 404);
});
