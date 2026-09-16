import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PRODUCT_PARENT_CATEGORIES, PRODUCT_TAXONOMY } from '../public/product-taxonomy.js';

const root = new URL('../public/', import.meta.url);

test('canonical taxonomy has exactly 34 approved baskets', () => {
  assert.equal(PRODUCT_PARENT_CATEGORIES.length, 34);
  assert.equal(PRODUCT_TAXONOMY.length, 34);
  assert.equal(new Set(PRODUCT_PARENT_CATEGORIES.map(([slug]) => slug)).size, 34);
  assert.equal(new Set(PRODUCT_TAXONOMY.map(([slug]) => slug)).size, 34);
});

test('every basket has exactly one valid owner', () => {
  const parents = new Set(PRODUCT_PARENT_CATEGORIES.map(([slug]) => slug));
  for (const [slug, fa, en, parent] of PRODUCT_TAXONOMY) {
    assert.ok(slug && fa && en, `incomplete basket: ${slug}`);
    assert.ok(parents.has(parent), `invalid parent for ${slug}: ${parent}`);
  }
});

test('Persian homepage is the default and English shell exists', async () => {
  const index = await readFile(new URL('index.html', root), 'utf8');
  const english = await readFile(new URL('en.html', root), 'utf8');
  assert.match(index, /<html[^>]+lang="fa"[^>]+dir="rtl"/);
  assert.match(english, /<html[^>]+lang="en"[^>]+dir="ltr"/);
  assert.match(index, /home-v5\.js/);
  assert.match(english, /home-v5\.js/);
  assert.doesNotMatch(index + english, /home-v4\.(css|js)/);
});

test('homepage does not hardcode a competing taxonomy in the search select', async () => {
  const index = await readFile(new URL('index.html', root), 'utf8');
  const selectMatch = index.match(/<select[^>]*id="afx-search-category"[\s\S]*?<\/select>/);
  assert.ok(selectMatch, 'search category select is missing');
  assert.doesNotMatch(selectMatch[0], /<optgroup|data-category=/);
});

test('homepage and runtime declare the canonical API boundary and ecosystem areas', async () => {
  const index = await readFile(new URL('index.html', root), 'utf8');
  const runtime = await readFile(new URL('home-v5.js', root), 'utf8');
  for (const marker of ['api.afaghx.com', 'Products', 'Suppliers', 'Factories', 'Services', 'Markets', 'Business Network', 'Procurement', 'Global Trade', 'INTELLIGENCE / AI', 'Trust']) assert.match(index + runtime, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${marker}`);
  assert.doesNotMatch(index + runtime, /fake data|dummy data|demo data|lorem ipsum/i);
});
