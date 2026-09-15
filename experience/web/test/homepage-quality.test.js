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

try {
  test('homepage exposes AFAGHX ecosystem command surface', () => {
    assert.match(html, /ECOSYSTEM COMMAND LAYER/);
    for (const marker of ['Discover', 'Qualify', 'Match', 'Connect', 'Trade']) {
      assert.match(html, new RegExp(marker));
    }
  });

  test('homepage exposes ecosystem product taxonomy beyond a generic commerce menu', () => {
    for (const marker of [
      'PRODUCT TAXONOMY',
      'خشکبار و نوشیدنی‌ها',
      'پوشاک',
      'خودرو و لوازم جانبی خودرو',
      'دستگاه‌ها و ماشین‌آلات',
      'انرژی',
      'کشاورزی',
      'مواد معدنی و متالورژی',
      'مواد شیمیایی',
      'خدمات تجاری',
      'خدمات ساخت',
      'قطعات الکترونیکی، لوازم جانبی و ارتباطات'
    ]) assert.match(html, new RegExp(marker));
  });

  test('homepage is explicit about architecture and runtime honesty', () => {
    assert.match(html, /Canonical API boundary/);
    assert.match(html, /No frontend → PostgreSQL/);
    assert.match(html, /Prototype/);
    assert.match(html, /لایه تجربه/);
    assert.match(html, /data-i18n=/);
    assert.match(html, /data-afx-i18n=/);
  });

  test('homepage keeps role-based ecosystem entry points', () => {
    for (const route of ['./customer.html', './business.html', './supplier.html', './factory.html', './partner.html']) {
      assert.match(html, new RegExp(route.replace('./', '\\./')));
    }
  });

  test('homepage search remains the canonical experience entry point', () => {
    assert.match(html, /id="search-form"/);
    assert.match(html, /id="afx-search-input"/);
    assert.match(html, /id="afx-search-category"/);
    assert.match(html, /https:\/\/api\.afaghx\.com/);
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}
