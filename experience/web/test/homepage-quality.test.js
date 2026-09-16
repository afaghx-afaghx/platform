import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { PRODUCT_PARENT_CATEGORIES, PRODUCT_TAXONOMY } from '../public/product-taxonomy.js';

let server;
let base;
await new Promise((resolve) => {
  server = createServer().listen(0, '127.0.0.1', () => {
    base = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
});

const html = await (await fetch(`${base}/`)).text();
const english = await (await fetch(`${base}/en.html`)).text();
const searchScript = await (await fetch(`${base}/home-v4.js`)).text();
const css = await (await fetch(`${base}/home-v4.css`)).text();

try {
  test('Persian homepage is the ecosystem command center', () => {
    assert.match(html, /<html lang="fa" dir="rtl">/);
    assert.match(html, /AFAGHX/);
    assert.match(html, /اکوسیستم هوشمند کسب‌وکار/);
    for (const id of ['search-form','afx-search-category','afx-search-input','taxonomy-families','routes','industry','procurement','trade','network','intelligence','trust']) assert.match(html, new RegExp(`id="${id}"`));
    for (const marker of ['محصولات','تأمین‌کنندگان','کارخانه‌ها','خدمات','بازارها']) assert.match(html, new RegExp(marker));
  });

  test('English homepage is executable and shares the same shell', () => {
    assert.match(english, /<html lang="en" dir="ltr">/);
    for (const id of ['search-form','afx-search-category','afx-search-input','taxonomy-families','routes','industry','procurement','trade','network','intelligence','trust']) assert.match(english, new RegExp(`id="${id}"`));
    assert.match(english, /Product and goods category names in Search remain Persian/);
    assert.match(english, /home-v4\.js/);
  });

  test('search runtime uses canonical taxonomy and API boundary', () => {
    assert.match(searchScript, /PRODUCT_PARENT_CATEGORIES/);
    assert.match(searchScript, /PRODUCT_TAXONOMY/);
    assert.match(searchScript, /group\.label\s*=\s*fa/);
    assert.match(searchScript, /new Option\(cfa, slug\)/);
    assert.match(searchScript, /const API_BASE = ['"]https:\/\/api\.afaghx\.com['"]/);
    assert.match(searchScript, /fetch\(`\$\{API_BASE\}\/v1\/search/);
    assert.doesNotMatch(searchScript, /new AfxCore|PersistentAfxCore|DATABASE_URL|postgres/i);
  });

  test('canonical taxonomy has exactly 18 families and 36 categories', () => {
    assert.equal(PRODUCT_PARENT_CATEGORIES.length, 18);
    assert.equal(PRODUCT_TAXONOMY.length, 36);
    assert.equal(new Set(PRODUCT_PARENT_CATEGORIES.map(([slug]) => slug)).size, 18);
    assert.equal(new Set(PRODUCT_TAXONOMY.map(([slug]) => slug)).size, 36);
    const parents = new Set(PRODUCT_PARENT_CATEGORIES.map(([slug]) => slug));
    for (const [slug, fa, en, parent] of PRODUCT_TAXONOMY) {
      assert.ok(slug && fa && en, `incomplete category: ${slug}`);
      assert.ok(parents.has(parent), `invalid parent for ${slug}: ${parent}`);
    }
  });

  test('real routes and canonical API boundary are present', () => {
    for (const route of ['./customer.html','./business.html','./supplier.html','./factory.html','./partner.html','./login.html']) assert.match(html, new RegExp(route.replace('./', '\\./')));
    assert.match(html, /https:\/\/api\.afaghx\.com/);
    assert.match(searchScript, /const API_BASE = ['"]https:\/\/api\.afaghx\.com['"]/);
    assert.match(searchScript, /\/v1\/search/);
  });

  test('no fabricated result dataset or fake verification is shipped', () => {
    assert.doesNotMatch(searchScript, /Prototype discovery result|Verified Supplier Network|Production Capacity/);
    assert.doesNotMatch(html, /Verified Supplier Network|Production Capacity/);
    assert.match(searchScript, /هیچ داده ساختگی نمایش داده نمی‌شود|no fabricated data is shown/);
  });

  test('homepage has responsive and interaction-oriented visual contracts', () => {
    for (const breakpoint of ['1120','820','520']) assert.match(css, new RegExp(`@media\\(max-width:${breakpoint}px\\)`));
    for (const selector of ['\\.hero-layout','\\.global-search','\\.intent-grid','\\.surface-grid','\\.taxonomy-grid','\\.trade-map']) assert.match(css, new RegExp(selector));
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}
