import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { PRODUCT_TAXONOMY } from '../public/product-taxonomy.js';

let server;
let base;
await new Promise((resolve) => {
  server = createServer().listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); });
});

const html = await (await fetch(`${base}/`)).text();
const english = await (await fetch(`${base}/en/index.html`)).text();
const searchScript = await (await fetch(`${base}/home-v5.js`)).text();
const css = await (await fetch(`${base}/home-v5.css`)).text();
const typography = await (await fetch(`${base}/home-v5-typography.css`)).text();

try {
  test('Persian homepage is the ecosystem command center', () => {
    assert.match(html, /<html lang="fa" dir="rtl">/);
    assert.match(html, /AFAGHX/);
    for (const id of ['search-form','afx-search-category','afx-search-input','taxonomy-families','routes','industry','procurement','trade','network','intelligence','trust']) assert.match(html, new RegExp(`id="${id}"`));
    for (const marker of ['محصولات','تأمین‌کنندگان','کارخانه‌ها','خدمات','بازارها']) assert.match(html, new RegExp(marker));
  });

  test('English homepage is executable and shares the same shell', () => {
    assert.match(english, /<html lang="en" dir="ltr">/);
    for (const id of ['search-form','afx-search-category','afx-search-input','discover','industry','procurement','trade','network','intelligence','trust']) assert.match(english, new RegExp(`id="${id}"`));
    assert.match(english, /34 product baskets/i);
  });

  test('search runtime uses only the canonical 34-basket taxonomy and API boundary', () => {
    assert.doesNotMatch(searchScript, /PRODUCT_PARENT_CATEGORIES/);
    assert.match(searchScript, /PRODUCT_TAXONOMY/);
    assert.match(searchScript, /const API_BASE = ['"]https:\/\/api\.afaghx\.com['"]/);
    assert.match(searchScript, /\/v1\/search/);
    assert.match(searchScript, /fetch\(/);
    assert.doesNotMatch(searchScript, /new AfxCore|PersistentAfxCore|DATABASE_URL|postgres/i);
  });

  test('canonical taxonomy has exactly 34 approved baskets and no duplicates', () => {
    assert.equal(PRODUCT_TAXONOMY.length, 34);
    assert.equal(new Set(PRODUCT_TAXONOMY.map(([slug]) => slug)).size, 34);
    for (const [slug, fa, en] of PRODUCT_TAXONOMY) assert.ok(slug && fa && en);
  });

  test('real routes and canonical API boundary are present', () => {
    for (const route of ['./customer.html','./business.html','./supplier.html','./factory.html','./partner.html','./login.html']) assert.match(html, new RegExp(route.replace('./', '\\./')));
    assert.match(searchScript, /https:\/\/api\.afaghx\.com/);
    assert.match(searchScript, /\/v1\/search/);
  });

  test('no fabricated result dataset or fake verification is shipped', () => {
    assert.doesNotMatch(searchScript, /Prototype discovery result|Verified Supplier Network|Production Capacity/);
    assert.doesNotMatch(html, /Verified Supplier Network|Production Capacity/);
    assert.match(searchScript, /هیچ داده ساختگی نمایش داده نمی‌شود|no fabricated data is shown/);
  });

  test('homepage has responsive and typography contracts', () => {
    for (const breakpoint of ['1120','820','520']) assert.match(css, new RegExp(`@media\\(max-width:${breakpoint}px\\)`));
    for (const selector of ['\\.hero-layout','\\.global-search','\\.intent-grid','\\.surface-grid','\\.taxonomy-grid','\\.trade-map']) assert.match(css, new RegExp(selector));
    assert.match(typography, /@fontsource\/vazirmatn@5\.2\.6\/400\.css/);
    assert.match(typography, /@fontsource\/inter@5\.2\.6\/400\.css/);
    assert.match(typography, /\.hero h1\{font-size:40px!important/);
  });


test('Persian typography uses Vazirmatn and hard-caps display sizes at 40px', () => {
  assert.match(typography, /--afx-persian-font:"Vazirmatn"/);
  assert.match(typography, /--afx-display-max:40px/);
  assert.match(typography, /font-size:clamp\\(30px,4vw,var\\(--afx-display-max\\)\\)!important/);
  assert.match(typography, /html\\[lang="fa"\\][\\s\\S]*font-family:var\\(--afx-persian-font\\)/);
});

} finally { await new Promise((resolve) => server.close(resolve)); }
