import test from 'node:test';
import assert from 'node:assert/strict';

const { createServer } = await import('../server.js');
let server;
let base;

await new Promise((resolve) => {
  server = createServer().listen(0, '127.0.0.1', resolve);
  base = `http://127.0.0.1:${server.address()?.port}`;
});

const html = await (await fetch(`${base}/`)).text();

try {
  test('homepage exposes AFAGHX ecosystem command surface', () => {
    assert.match(html, /ECOSYSTEM COMMAND LAYER/);
    assert.match(html, /One journey, five system moves/);
    assert.match(html, /Discover/);
    assert.match(html, /Qualify/);
    assert.match(html, /Match/);
    assert.match(html, /Connect/);
    assert.match(html, /Trade/);
  });

  test('homepage exposes ecosystem-wide structure beyond commerce', () => {
    for (const marker of [
      'Industrial Materials',
      'Machinery &amp; Equipment',
      'Energy',
      'Chemicals',
      'Agriculture',
      'Logistics',
      'Professional Services',
      'Business Network',
      'Commerce &amp; Procurement',
      'Industry &amp; Factory Network'
    ]) assert.match(html, new RegExp(marker));
  });

  test('homepage is explicit about architecture and runtime honesty', () => {
    assert.match(html, /Canonical API boundary/);
    assert.match(html, /No frontend → PostgreSQL/);
    assert.match(html, /Prototype data clearly labeled/);
    assert.match(html, /Experience Layer/);
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
