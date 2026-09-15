import test from 'node:test';
import assert from 'node:assert/strict';

const { createServer } = await import('../server.js');
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
const taxonomy = await (await fetch(`${base}/product-taxonomy.js`)).text();
const searchScript = await (await fetch(`${base}/home-v3.js`)).text();

try {
  test('Persian homepage is the deterministic default', () => {
    assert.match(html, /<html lang="fa" dir="rtl">/);
    assert.match(html, /AFAGHX \| اکوسیستم هوشمند کسب‌وکار و تجارت/);
    assert.match(html, /خشکبار و نوشیدنی‌ها/);
    assert.match(html, /پوشاک/);
    assert.match(html, /دستگاه‌ها و ماشین‌آلات/);
  });

  test('English homepage is present and executable', () => {
    assert.match(english, /<html lang="en" dir="ltr">/);
    assert.match(english, /Intelligent Business &amp; Trade Ecosystem|Intelligent Business & Trade Ecosystem/);
    assert.match(english, /id="search-form"/);
    assert.match(english, /id="afx-search-category"/);
    assert.match(english, /home-v3\.js/);
  });

  test('English search keeps product/category names in Persian', () => {
    assert.match(searchScript, /group\.label=fa/);
    assert.match(searchScript, /o\.textContent=cfa/);
    assert.doesNotMatch(searchScript, /o\.textContent=state\.lang==='fa'\?cfa:cen/);
  });

  test('taxonomy has 36 children distributed across distinct parent families', () => {
    const entries = taxonomy.match(/\['[^']*','[^']*','[^']*','[^']*'\]/g) || [];
    assert.equal(entries.length, 36);
    assert.match(taxonomy, /'dry-fruits-beverages','خشکبار و نوشیدنی‌ها','Dried Fruits & Beverages','food-consumer'/);
    assert.match(taxonomy, /'clothing','پوشاک','Clothing','fashion-lifestyle'/);
    assert.match(taxonomy, /'automotive','خودرو و لوازم جانبی خودرو','Automotive & Accessories','automotive-transport'/);
    assert.match(taxonomy, /'machinery-equipment','دستگاه‌ها و ماشین‌آلات','Machinery & Equipment','industrial-equipment'/);
    assert.match(taxonomy, /'business-services','خدمات تجاری','Business Services','services'/);
    assert.match(taxonomy, /'packaging-printing','بسته‌بندی و چاپ','Packaging & Printing','industrial-materials'/);
    assert.doesNotMatch(taxonomy, /'clothing','پوشاک','Clothing','food-consumer'/);
    assert.doesNotMatch(taxonomy, /'automotive','خودرو و لوازم جانبی خودرو','Automotive & Accessories','food-consumer'/);
    assert.doesNotMatch(taxonomy, /'machinery-equipment','دستگاه‌ها و ماشین‌آلات','Machinery & Equipment','food-consumer'/);
  });

  test('homepage exposes canonical ecosystem search and role entry points', () => {
    for (const marker of ['Discover', 'Qualify', 'Match', 'Connect', 'Trade', 'PRODUCT TAXONOMY', 'Canonical API boundary', 'Prototype']) {
      assert.match(html, new RegExp(marker));
    }
    assert.match(html, /id="search-form"/);
    assert.match(html, /id="afx-search-input"/);
    assert.match(html, /id="afx-search-category"/);
    assert.match(html, /https:\/\/api\.afaghx\.com/);
    for (const route of ['./customer.html', './business.html', './supplier.html', './factory.html', './partner.html']) {
      assert.match(html, new RegExp(route.replace('./', '\\./')));
    }
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}
