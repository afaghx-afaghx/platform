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

try {
  await test('roles hub includes bilingual runtime and five canonical role routes', async () => {
    const html = await (await fetch(`${base}/roles.html`)).text();
    assert.match(html, /role-experience\.js/);
    for (const route of ['./customer.html', './business.html', './supplier.html', './factory.html', './partner.html']) {
      assert.match(html, new RegExp(route.replace('./', '\\./')));
    }
    assert.match(html, /مسیر تجربه خود را انتخاب کنید/);
    assert.match(html, /Canonical API/);
    assert.match(html, /<nav>/);
  });

  await test('role runtime contains English and Persian Experience Hub copy', async () => {
    const js = await (await fetch(`${base}/role-experience.js`)).text();
    for (const marker of ['Choose Your Experience', 'مسیر تجربه خود را انتخاب کنید', 'Canonical API', 'localStorage']) {
      assert.ok(js.includes(marker), `missing marker: ${marker}`);
    }
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}
