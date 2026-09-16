import test from 'node:test';
import assert from 'node:assert/strict';

const { createServer } = await import('../server.js');
let server; let base;
await new Promise((resolve) => { server = createServer().listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); }); });
const html = await (await fetch(`${base}/`)).text();
const english = await (await fetch(`${base}/en.html`)).text();
const taxonomy = await (await fetch(`${base}/product-taxonomy.js`)).text();
const searchScript = await (await fetch(`${base}/home-v4.js`)).text();
const css = await (await fetch(`${base}/home-v4.css`)).text();
try {
  test('Persian homepage is the real ecosystem command center', () => {
    assert.match(html, /<html lang="fa" dir="rtl">/);
    assert.match(html, /One Network|اکوسیستم/);
    for (const id of ['search-form','afx-search-category','afx-search-input','taxonomy-families','routes','industry','procurement','trade','network','intelligence','trust']) assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, /Products|محصولات/); assert.match(html, /Suppliers|تأمین‌کنندگان/); assert.match(html, /Factories|کارخانه‌ها/); assert.match(html, /Services|خدمات/); assert.match(html, /Markets|بازارها/);
  });
  test('English homepage is executable and shares the same architecture', () => {
    assert.match(english, /<html lang="en" dir="ltr">/);
    for (const id of ['search-form','afx-search-category','afx-search-input','taxonomy-families','routes','industry','procurement','trade','network','intelligence','trust']) assert.match(english, new RegExp(`id="${id}"`));
    assert.match(english, /Product and goods category names in Search remain Persian/);
  });
  test('Search category contract keeps Persian goods/category labels on both languages', () => {
    assert.match(searchScript, /group\.label = fa/);
    assert.match(searchScript, /new Option\(cfa, slug\)/);
    assert.doesNotMatch(searchScript, /new Option\(state\.lang/);
    assert.match(searchScript, /https:\/\/api\.afaghx\.com\/v1\/search/);
  });
  test('canonical taxonomy is exactly 18 families and 36 children with correct ownership', () => {
    const entries = taxonomy.match(/\['[^']*','[^']*','[^']*','[^']*'\]/g) || [];
    const parentSection = taxonomy.split('export const PRODUCT_TAXONOMY')[0];
    const parents = parentSection.match(/\['[^']*','[^']*','[^']*'\]/g) || [];
    assert.equal(entries.length, 36); assert.equal(parents.length, 18);
    for (const marker of [
      "'dry-fruits-beverages', 'خشکبار و نوشیدنی', 'Dried Fruits & Beverages', 'food-consumer'",
      "'clothing', 'پوشاک', 'Clothing', 'fashion-lifestyle'",
      "'automotive', 'خودرو و حمل‌ونقل', 'Automotive & Transport', 'automotive-transport'",
      "'machinery-equipment', 'ماشین‌آلات و تجهیزات', 'Machinery & Equipment', 'industrial-equipment'",
      "'business-services', 'خدمات کسب‌وکار', 'Business Services', 'services'",
      "'packaging-printing', 'بسته‌بندی و چاپ', 'Packaging & Printing', 'industrial-materials'",
      "'service-solutions', 'راهکارها و خدمات تخصصی', 'Specialized Services & Solutions', 'services'"
    ]) assert.match(taxonomy, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(taxonomy, /'clothing', 'پوشاک', 'Clothing', 'food-consumer'/);
    assert.doesNotMatch(taxonomy, /'automotive', 'خودرو و حمل‌ونقل', 'Automotive & Transport', 'food-consumer'/);
    assert.doesNotMatch(taxonomy, /'machinery-equipment', 'ماشین‌آلات و تجهیزات', 'Machinery & Equipment', 'food-consumer'/);
  });
  test('real routes and canonical API boundary are present', () => {
    for (const route of ['./customer.html','./business.html','./supplier.html','./factory.html','./partner.html','./login.html']) assert.match(html, new RegExp(route.replace('./','\\./')));
    assert.match(html, /https:\/\/api\.afaghx\.com/); assert.match(searchScript, /fetch\(`\$\{API_BASE\}\/v1\/search/);
  });
  test('no fabricated result dataset or fake verification is shipped', () => {
    assert.doesNotMatch(searchScript, /const\s+demo\s*=|Prototype discovery result|Verified Supplier Network|Production Capacity/);
    assert.match(searchScript, /no fabricated data is shown|هیچ داده ساختگی نمایش داده نمی‌شود/);
    assert.doesNotMatch(html, /Verified Supplier Network|Production Capacity/);
  });
  test('homepage has responsive and interaction-oriented visual contracts', () => {
    for (const breakpoint of ['1100','820','520']) assert.match(css, new RegExp(`@media\\(max-width:${breakpoint}px\\)`));
    for (const selector of ['\\.hero-layout','\\.global-search','\\.intent-grid','\\.surface-grid','\\.taxonomy-grid','\\.trade-map']) assert.match(css, new RegExp(selector));
  });
} finally { await new Promise((resolve) => server.close(resolve)); }
