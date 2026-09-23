import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from '../server.js';
import { PRODUCT_TAXONOMY } from '../public/product-taxonomy.js';

const ROOT = new URL('../public/', import.meta.url);
const read = async (name) => readFile(new URL(name, ROOT), 'utf8');

const files = {
  html: await read('index.html'),
  english: await read('en.html'),
  js: await read('home-v5.js'),
  css: await read('home-v5.css'),
  typography: await read('home-v5-typography.css'),
  taxonomy: await read('product-taxonomy.js'),
};

test('AFX-EXPERIENCE: V5 naming integrity', () => {
  assert.doesNotMatch(files.html, /home-v4\.(css|js)/);
  assert.doesNotMatch(files.english, /home-v4\.(css|js)/);
});

test('EXPERIENCE-ARCH-10: presentation boundary', () => {
  assert.doesNotMatch(files.js, /new AfxCore|PersistentAfxCore|DATABASE_URL|postgres/i);
  assert.match(files.js, /API_BASE\s*=\s*['"]https:\/\/api\.afaghx\.com['"]/);
  assert.match(files.js, /\/v1\/search/);
});

test('EXPERIENCE-ARCH-10: canonical taxonomy is exactly 34 direct baskets', () => {
  assert.equal(PRODUCT_TAXONOMY.length, 34);
  assert.equal(new Set(PRODUCT_TAXONOMY.map(([slug]) => slug)).size, 34);
  assert.doesNotMatch(files.taxonomy, /PRODUCT_PARENT_CATEGORIES/);
  assert.match(files.taxonomy, /PRODUCT_TAXONOMY/);
  assert.doesNotMatch(files.js, /PRODUCT_PARENT_CATEGORIES/);
});

test('EXPERIENCE-ARCH-10: browser/server boundary returns canonical 404', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const localApi = await fetch(`${base}/api/search`);
    assert.equal(localApi.status, 404);
    assert.equal((await localApi.json()).error, 'canonical_api_only');
    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    assert.match(home.headers.get('content-security-policy') ?? '', /connect-src[^;]*https:\/\/api\.afaghx\.com/);
    assert.match(home.headers.get('content-security-policy') ?? '', /font-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
    assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

console.log('AFX-EXPERIENCE gate: machine-enforced checks loaded.');
