import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const taxonomy = fs.readFileSync(new URL('../public/product-taxonomy.js', import.meta.url), 'utf8');
const faHome = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const enHome = fs.readFileSync(new URL('../public/en/index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../public/home-v5.js', import.meta.url), 'utf8');

test('canonical taxonomy contains exactly 34 baskets', () => {
  const entries = taxonomy.match(/^\s{2}\['[^']+',/gm) || [];
  assert.equal(entries.length, 34);
});

test('homepage taxonomy renders from canonical runtime container', () => {
  assert.match(faHome, /id="taxonomy-families"/);
  assert.match(enHome, /id="taxonomy-families"/);
});

test('language surfaces are separated', () => {
  assert.match(faHome, /lang="fa" dir="rtl"/);
  assert.match(enHome, /lang="en" dir="ltr"/);
  assert.doesNotMatch(enHome, /[\u0600-\u06FF]{2,}/);
});

test('canonical UX contract defines four requested languages', () => {
  const contract = fs.readFileSync(new URL('../public/afaghx-experience-contract.js', import.meta.url), 'utf8');
  for (const label of ['فارسی','English','العربية','Türkçe']) assert.match(contract, new RegExp(label));
  assert.match(contract, /active: true/);
  assert.match(contract, /active: false/);
});