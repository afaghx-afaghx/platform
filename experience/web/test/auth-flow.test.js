import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

const { createServer } = await import('../server.js');
let server;
let base;
before(async () => await new Promise(resolve => { server = createServer().listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); }); }));
after(async () => await new Promise(resolve => server.close(resolve)));

test('experience shell serves the AFAGHX ecosystem homepage', async () => {
  const response = await fetch(`${base}/`); assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /AFAGHX/); assert.match(html, /اکوسیستم/); assert.match(html, /Intelligent Business & Trade Ecosystem/);
});

test('homepage keeps bilingual language runtime support', async () => {
  const html = await (await fetch(`${base}/`)).text();
  const english = await (await fetch(`${base}/en.html`)).text();
  const script = await (await fetch(`${base}/home-v4.js`)).text();
  assert.match(html, /lang="fa"/); assert.match(html, /شبکه جهانی کسب‌وکار و تجارت/); assert.match(html, /Intelligent Business & Trade Ecosystem/);
  assert.match(english, /<html lang="en" dir="ltr">/); assert.match(english, /Intelligent Business & Trade Ecosystem/);
  assert.match(script, /PRODUCT_TAXONOMY/); assert.match(script, /PRODUCT_PARENT_CATEGORIES/); assert.match(script, /location\.pathname\.endsWith\('\/en\.html'\)/); assert.match(script, /switchLanguage/);
});

test('role journeys remain presentation-only and available', async () => {
  for (const route of ['/customer.html', '/business.html', '/supplier.html', '/factory.html', '/partner.html']) {
    const response = await fetch(`${base}${route}`); assert.equal(response.status, 200, route);
    const html = await response.text(); assert.doesNotMatch(html, /DATABASE_URL|postgres|AfxCore|PersistentAfxCore/i, route);
  }
});

test('experience shell never owns authentication APIs', async () => {
  const response = await fetch(`${base}/api/auth/me`); assert.equal(response.status, 404); assert.deepEqual(await response.json(), { error: 'canonical_api_only' });
});

test('experience shell does not expose credentials or an in-memory auth bootstrap', async () => {
  const response = await fetch(`${base}/server.js`); assert.equal(response.status, 404);
});
