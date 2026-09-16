import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PRODUCT_TAXONOMY } from '../public/product-taxonomy.js';

const root = new URL('../public/', import.meta.url);

test('canonical taxonomy has exactly 34 approved baskets', () => {
  assert.equal(PRODUCT_TAXONOMY.length, 34);
  assert.equal(new Set(PRODUCT_TAXONOMY.map(([slug]) => slug)).size, 34);
});

test('every approved basket is directly selectable without a family layer', () => {
  for (const [slug, fa, en] of PRODUCT_TAXONOMY) assert.ok(slug && fa && en, `incomplete basket: ${slug}`);
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

test('homepage search select has no family or parent layer', async () => {
  const index = await readFile(new URL('index.html', root), 'utf8');
  const selectMatch = index.match(/<select[^>]*id="afx-search-category"[\s\S]*?<\/select>/);
  assert.ok(selectMatch, 'search category select is missing');
  assert.doesNotMatch(selectMatch[0], /<optgroup|data-category=/);
});

test('runtime search options come only from the 34-basket canonical taxonomy', async () => {
  const runtime = await readFile(new URL('home-v5.js', root), 'utf8');
  assert.doesNotMatch(runtime, /PRODUCT_PARENT_CATEGORIES/);
  assert.match(runtime, /PRODUCT_TAXONOMY\.forEach/);
  assert.match(runtime, /new Option\(state\.lang === 'fa' \? fa : en, slug\)/);
  assert.match(runtime, /همه سبدها/);
  assert.match(runtime, /All baskets/);
});

test('homepage and runtime declare the canonical API boundary and ecosystem areas', async () => {
  const index = await readFile(new URL('index.html', root), 'utf8');
  const runtime = await readFile(new URL('home-v5.js', root), 'utf8');
  const source = index + runtime;
  for (const marker of ['api.afaghx.com', 'Products', 'Suppliers', 'Factories', 'Services', 'Markets', 'NETWORK', 'PROCUREMENT ENGINE', 'GLOBAL TRADE', 'INTELLIGENCE / AI', 'TRUST / VERIFICATION']) {
    assert.ok(source.includes(marker), `missing ${marker}`);
  }
  assert.doesNotMatch(source, /fake data|dummy data|demo data|lorem ipsum/i);
});
