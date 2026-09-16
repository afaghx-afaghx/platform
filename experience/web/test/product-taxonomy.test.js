import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_PARENT_CATEGORIES, PRODUCT_TAXONOMY } from '../public/product-taxonomy.js';

const { createServer } = await import('../server.js');
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const html = await (await fetch(`${base}/`)).text();
const script = await (await fetch(`${base}/home-v4.js`)).text();

try {
  test('canonical taxonomy exposes exactly 18 families and 36 categories', () => {
    assert.equal(PRODUCT_PARENT_CATEGORIES.length, 18);
    assert.equal(PRODUCT_TAXONOMY.length, 36);
    assert.equal(new Set(PRODUCT_PARENT_CATEGORIES.map(([slug]) => slug)).size, 18);
    assert.equal(new Set(PRODUCT_TAXONOMY.map(([slug]) => slug)).size, 36);
  });

  test('every approved category has a stable slug and valid family owner', () => {
    const parents = new Set(PRODUCT_PARENT_CATEGORIES.map(([slug]) => slug));
    for (const [slug, fa, en, parent] of PRODUCT_TAXONOMY) {
      assert.ok(slug && fa && en, `incomplete category: ${slug}`);
      assert.ok(parents.has(parent), `invalid parent for ${slug}: ${parent}`);
    }
  });

  test('approved taxonomy includes representative canonical slugs', () => {
    const slugs = new Set(PRODUCT_TAXONOMY.map(([slug]) => slug));
    for (const slug of [
      'dry-fruits-beverages', 'clothing', 'automotive', 'home-appliances',
      'consumer-electronics', 'machinery-equipment', 'packaging-printing',
      'service-equipment', 'business-services', 'service-solutions',
      'security-protection'
    ]) assert.ok(slugs.has(slug), slug);
    assert.ok(!slugs.has('home-textiles'), 'obsolete non-canonical slug must not return');
  });

  test('homepage delegates taxonomy rendering to the canonical runtime module', () => {
    assert.match(html, /id="afx-search-category"/);
    assert.match(html, /home-v4\.js/);
    assert.match(script, /PRODUCT_PARENT_CATEGORIES/);
    assert.match(script, /PRODUCT_TAXONOMY/);
    assert.match(script, /new Option\(cfa, slug\)/);
  });

  test('category chips use stable taxonomy slugs at runtime', () => {
    assert.match(script, /data-category/);
    for (const [slug] of PRODUCT_TAXONOMY.slice(0, 5)) assert.match(script, new RegExp(slug));
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}
