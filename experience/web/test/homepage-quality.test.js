import test from 'node:test';
import assert from 'node:assert/strict';

const { createServer } = await import('../server.js');
let server;
let base;
await new Promise((resolve) => { server = createServer().listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); }); });
const html = await (await fetch(`${base}/`)).text();
const english = await (await fetch(`${base}/en.html`)).text();
const taxonomy = await (await fetch(`${base}/product-taxonomy.js`)).text();
const searchScript = await (await fetch(`${base}/home-v4.js`)).text();
const css = await (await fetch(`${base}/home-v4.css`)).text();
try {
  test('V4 Persian homepage is the deterministic default', () => {
    assert.match(html, /<html lang="fa" dir="rtl">/);
    assert.match(html, /AFAGHX \| اکوسیستم هوشمند کسب‌وکار و تجارت/);
    assert.match(html, /AFAGHX ECOSYSTEM COMMAND CENTER/);
    assert.match(html, /id="search-form"/);
    assert.match(html, /id="afx-search-category"/);
    assert.match(html, /id="afx-search-input"/);
    assert.match(html, /home-v4\.js/);
    assert.match(html, /home-v4\.css/);
  });
  test('English V4 homepage is real and executable', () => {
    assert.match(english, /<html lang="en" dir="ltr">/);
    assert.match(english, /Intelligent Business & Trade Ecosystem/);
    assert.match(english, /id="search-form"/);
    assert.match(english, /id="afx-search-category"/);
    assert.match(english, /home-v4\.js/);
  });
  test('English Search keeps all product/category labels Persian', () => {
    assert.match(searchScript, /group\.label = fa/);
    assert.match(searchScript, /option\.textContent = cfa/);
    assert.doesNotMatch(searchScript, /option\.textContent\s*=\s*state\.lang/);
  });
  test('taxonomy has exactly 36 children and 18 primary families', () => {
    const entries = taxonomy.match(/\['[^']*','[^']*','[^']*','[^']*'\]/g) || [];
    const parentSection = taxonomy.split('export const PRODUCT_TAXONOMY')[0];
    const parents = parentSection.match(/\['[^']*','[^']*','[^']*'\]/g) || [];
    assert.equal(entries.length, 36); assert.equal(parents.length, 18);
    for (const marker of [
      "'dry-fruits-beverages','خشکبار و نوشیدنی‌ها','Dried Fruits & Beverages','food-consumer'",
      "'clothing','پوشاک','Clothing','fashion-lifestyle'",
      "'automotive','خودرو و لوازم جانبی خودرو','Automotive & Accessories','automotive-transport'",
      "'machinery-equipment','دستگاه‌ها و ماشین‌آلات','Machinery & Equipment','industrial-equipment'",
      "'business-services','خدمات تجاری','Business Services','services'",
      "'packaging-printing','بسته‌بندی و چاپ','Packaging & Printing','industrial-materials'"
    ]) assert.match(taxonomy, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(taxonomy, /'clothing','پوشاک','Clothing','food-consumer'/);
    assert.doesNotMatch(taxonomy, /'automotive','خودرو و لوازم جانبی خودرو','Automotive & Accessories','food-consumer'/);
    assert.doesNotMatch(taxonomy, /'machinery-equipment','دستگاه‌ها و ماشین‌آلات','Machinery & Equipment','food-consumer'/);
  });
  test('V4 exposes all required ecosystem routes and trust boundary', () => {
    for (const marker of ['Products','Suppliers','Factories','Services & Partners','Business Network','INDUSTRY & MANUFACTURING','PROCUREMENT','GLOBAL TRADE','INTELLIGENCE / AI','TRUST / VERIFICATION','Canonical API','18','۳۶']) assert.match(html, new RegExp(marker));
    for (const route of ['./customer.html','./business.html','./supplier.html','./factory.html','./partner.html','./login.html']) assert.match(html, new RegExp(route.replace('./','\\./')));
    assert.match(html, /https:\/\/api\.afaghx\.com/); assert.match(searchScript, /https:\/\/api\.afaghx\.com\/v1\/search/);
  });
  test('V4 does not ship fabricated search fallback data', () => {
    assert.doesNotMatch(searchScript, /const\s+demo\s*=|Prototype discovery result|Verified Supplier Network|Production Capacity/);
    assert.match(searchScript, /no fabricated data is shown|هیچ داده ساختگی نمایش داده نمی‌شود/);
  });
  test('responsive UX contract exists in CSS', () => {
    assert.match(css, /@media\(max-width:1100px\)/); assert.match(css, /@media\(max-width:780px\)/); assert.match(css, /@media\(max-width:480px\)/); assert.match(css, /\.hero-grid/); assert.match(css, /\.search/);
  });
} finally { await new Promise((resolve) => server.close(resolve)); }
