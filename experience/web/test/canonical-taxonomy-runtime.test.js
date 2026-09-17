import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PRODUCT_TAXONOMY } from '../public/product-taxonomy.js';

test('canonical taxonomy has exactly 34 flat baskets', () => {
  assert.equal(PRODUCT_TAXONOMY.length, 34);
  assert.ok(PRODUCT_TAXONOMY.every(entry => entry.length === 3));
});

test('home-v3 consumes the canonical flat taxonomy without a parent model', async () => {
  const source = await fs.readFile(new URL('../public/home-v3.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /PRODUCT_PARENT_CATEGORIES/);
  assert.match(source, /PRODUCT_TAXONOMY\.forEach/);
});
