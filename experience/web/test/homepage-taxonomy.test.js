import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PRODUCT_PARENT_CATEGORIES, PRODUCT_TAXONOMY } from '../public/product-taxonomy.js';

const root = new URL('../public/', import.meta.url);

function categoryMap() {
  return new Map(PRODUCT_TAXONOMY.map(([slug, fa, en, parent]) => [slug, { slug, fa, en, parent }]));
}

test('canonical taxonomy has exactly 18 families and 36 categories', () => {
  assert.equal(PRODUCT_PARENT_CATEGORIES.length, 18);
  assert.equal(PRODUCT_TAXONOMY.length, 36);
  assert.equal(new Set(PRODUCT_PARENT_CATEGORIES.map(([slug]) => slug)).size, 18);
  assert.equal(new Set(PRODUCT_TAXONOMY.map(([slug]) => slug)).size, 36);
});

test('every category has exactly one valid family parent', () => {
  const parents = new Set(PRODUCT_PARENT_CATEGORIES.map(([slug]) => slug));
  for (const [slug, fa, en, parent] of PRODUCT_TAXONOMY) {
    assert.ok(slug && fa && en, `incomplete category: ${slug}`);
    assert.ok(parents.has(parent), `invalid parent for ${slug}: ${parent}`);
  }
});

test('canonical family/category distribution is intentional', () => {
  const counts = Object.fromEntries(PRODUCT_PARENT_CATEGORIES.map(([slug]) => [slug, 0]));
  for (const [, , , parent] of PRODUCT_TAXONOMY) counts[parent] += 1;
  assert.deepEqual(counts, {
    'food-consumer': 1,
    'fashion-lifestyle': 5,
    'automotive-transport': 1,
    'home-living': 4,
    'technology-electronics': 2,
    'office-education': 1,
    'sports-recreation': 2,
    'beauty-personal-care': 1,
    'health-medical': 1,
    'industrial-equipment': 3,
    'energy-environment': 2,
    'industrial-materials': 2,
    'construction-building': 3,
    'agriculture-food': 1,
    'raw-materials': 1,
    'chemicals-materials': 2,
    'security-protection': 1,
    'services': 3,
  });
});

test('Persian homepage is the default and English shell exists', async () => {
  const index = await readFile(new URL('index.html', root), 'utf8');
  const english = await readFile(new URL('en.html', root), 'utf8');
  assert.match(index, /<html[^>]+lang="fa"[^>]+dir="rtl"/);
  assert.match(english, /<html[^>]+lang="en"[^>]+dir="ltr"/);
  assert.match(index, /home-v4\.js/);
  assert.match(english, /home-v4\.js/);
});

test('English page keeps product category labels Persian by contract', async () => {
  const english = await readFile(new URL('en.html', root), 'utf8');
  assert.match(english, /Product and goods category names in Search remain Persian/);
  assert.match(english, /id="afx-search-category"/);
});

test('homepage does not hardcode a competing taxonomy in the search select', async () => {
  const index = await readFile(new URL('index.html', root), 'utf8');
  const selectMatch = index.match(/<select[^>]*id="afx-search-category"[\s\S]*?<\/select>/);
  assert.ok(selectMatch, 'search category select is missing');
  assert.doesNotMatch(selectMatch[0], /<optgroup|data-category=/, 'taxonomy must be generated from product-taxonomy.js');
});

test('homepage declares the canonical API boundary and required ecosystem areas', async () => {
  const index = await readFile(new URL('index.html', root), 'utf8');
  for (const marker of ['api.afaghx.com', 'Products', 'Suppliers', 'Factories', 'Services', 'Markets', 'Business Network', 'Procurement', 'Global Trade', 'Intelligence / AI', 'Trust']) {
    assert.match(index, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${marker}`);
  }
  assert.doesNotMatch(index, /fake data|dummy data|demo data|lorem ipsum/i);
});
