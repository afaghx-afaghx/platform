import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const taxonomy = fs.readFileSync(new URL('../public/product-taxonomy.js', import.meta.url), 'utf8');
const faHome = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const enHome = fs.readFileSync(new URL('../public/en/index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../public/home-v5.js', import.meta.url), 'utf8');
const visualV8 = fs.readFileSync(new URL('../public/afaghx-home-premium-v8.css', import.meta.url), 'utf8');

test('canonical taxonomy contains exactly 34 baskets', () => {
  const entries = taxonomy.match(/^\s{2}\['[^']+',/gm) || [];
  assert.equal(entries.length, 34);
});

test('homepage taxonomy renders from canonical runtime container', () => {
  assert.match(faHome, /id="taxonomy-families"/);
  assert.match(enHome, /id="taxonomy-families"/);
});

test('34-basket taxonomy is the first homepage content section after the header', () => {
  for (const home of [faHome, enHome]) {
    const main = home.indexOf('<main>');
    const taxonomy = home.indexOf('<section class="section" id="taxonomy">');
    const hero = home.search(/<section class="(?:en-)?hero" id="discover">/);
    assert.ok(main >= 0 && taxonomy > main && (hero < 0 || taxonomy < hero));
  }
});

test('all 34 baskets render as a four-column first-row grid', () => {
  assert.match(runtime, /PRODUCT_TAXONOMY\.map/);
  assert.match(runtime, /family-row-item/);
  assert.doesNotMatch(runtime, /slice\(0, 10\)/);
  assert.doesNotMatch(runtime, /taxonomy-all/);
});

test('final visual system keeps one coherent palette and four-column desktop basket grid', () => {
  assert.match(faHome, /<link rel="stylesheet" href="\.\/afaghx-home-premium-v8\.css">/);
  assert.doesNotMatch(faHome, /afaghx-home-premium-v6\.css[^>]*<link/);
  assert.match(enHome, /<link rel="stylesheet" href="\.\.\/afaghx-home-premium-v8\.css">/);
  assert.doesNotMatch(enHome, /afaghx-home-premium-v6\.css[^>]*<link/);
  assert.match(visualV8, /--afx-v8-blue:#1668d7/);
  assert.match(visualV8, /--afx-v8-mint:#27c79b/);
  assert.match(visualV8, /#taxonomy \.taxonomy-grid/);
  assert.match(visualV8, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(visualV8, /@media\(max-width:900px\)/);
  assert.match(visualV8, /repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(visualV8, /@media\(max-width:620px\)/);
  assert.match(visualV8, /#taxonomy \.taxonomy-grid\{[\s\S]*grid-template-columns:1fr/);
  assert.doesNotMatch(visualV8, /#b8ff3d|#d7ff83|#f2ffd0/);
  assert.match(faHome, /<select aria-label="زبان"/);
  assert.match(faHome, /value="\.\/en\/index\.html"/);
  assert.match(enHome, /<select aria-label="Language"/);
  assert.match(enHome, /value="\.\.\/index\.html"/);
});

test('taxonomy keeps all 34 approved baskets direct and grid-ready', () => {
  assert.match(runtime, /PRODUCT_TAXONOMY\.map/);
  assert.match(runtime, /family-row-item/);
});

test('language surfaces are separated', () => {
  assert.match(faHome, /lang="fa" dir="rtl"/);
  assert.match(enHome, /lang="en" dir="ltr"/);
  const enContentWithoutLanguageControl = enHome.replace(/<select class="language-switcher"[^>]*>[\\s\\S]*?<\\/select>/g, '');
  assert.doesNotMatch(enContentWithoutLanguageControl, /[\\u0600-\\u06FF]{2,}/);
});

test('canonical UX contract defines four requested languages', () => {
  const contract = fs.readFileSync(new URL('../public/afaghx-experience-contract.js', import.meta.url), 'utf8');
  for (const label of ['فارسی','English','العربية','Türkçe']) assert.match(contract, new RegExp(label));
  assert.match(contract, /active: true/);
  assert.match(contract, /active: false/);
});