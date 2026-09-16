import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_PARENT_CATEGORIES, PRODUCT_TAXONOMY } from '../public/product-taxonomy.js';

const { createServer } = await import('../server.js');
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const html = await (await fetch(`${base}/`)).text();
const script = await (await fetch(`${base}/home-v5.js`)).text();

try {
  test('canonical taxonomy exposes exactly 34 approved baskets', () => {
    assert.equal(PRODUCT_PARENT_CATEGORIES.length, 34);
    assert.equal(PRODUCT_TAXONOMY.length, 34);
    assert.equal(new Set(PRODUCT_PARENT_CATEGORIES.map(([slug]) => slug)).size, 34);
    assert.equal(new Set(PRODUCT_TAXONOMY.map(([slug]) => slug)).size, 34);
  });

  test('every approved basket has a stable slug and valid owner', () => {
    const parents = new Set(PRODUCT_PARENT_CATEGORIES.map(([slug]) => slug));
    for (const [slug, fa, en, parent] of PRODUCT_TAXONOMY) { assert.ok(slug && fa && en); assert.ok(parents.has(parent)); }
  });

  test('approved taxonomy includes the requested representative baskets', () => {
    const slugs = new Set(PRODUCT_TAXONOMY.map(([slug]) => slug));
    for (const slug of ['dry-fruits-beverages','clothing','automotive-accessories','home-appliances','consumer-electronics','machinery-equipment','packaging-printing','services','security-protection']) assert.ok(slugs.has(slug), slug);
    assert.ok(!slugs.has('service-equipment'));
    assert.ok(!slugs.has('business-services'));
    assert.ok(!slugs.has('service-solutions'));
  });

  test('homepage delegates taxonomy rendering to the canonical V5 runtime module', () => {
    assert.match(html, /id="afx-search-category"/);
    assert.match(html, /home-v5\.js/);
    assert.match(script, /PRODUCT_PARENT_CATEGORIES/);
    assert.match(script, /PRODUCT_TAXONOMY/);
    assert.match(script, /new Option\(fa, slug\)/);
  });

  test('category chips use stable taxonomy slugs at runtime', () => {
    assert.match(script, /data-category/);
    assert.match(script, /escapeHtml\(slug\)/);
    assert.equal(PRODUCT_TAXONOMY.length, 34);
  });
} finally { await new Promise((resolve) => server.close(resolve)); }
