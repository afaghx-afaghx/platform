import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

let server;
let base;
await new Promise((resolve) => {
  server = createServer().listen(0, '127.0.0.1', () => {
    base = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
});

try {
  const script = await (await fetch(`${base}/commerce-discovery-v1.js`)).text();

  test('header cart has a single idempotent runtime owner', () => {
    assert.match(script, /function enforceHeaderCart\(\)/);
    assert.match(script, /function watchHeaderCart\(\)/);
    assert.match(script, /__AFX_HEADER_CART_RUNTIME__/);
    assert.match(script, /__AFX_HEADER_CART_SYNC__/);
    assert.match(script, /MutationObserver/);
    assert.match(script, /querySelectorAll\('\.afx-cart'\)/);
  });

  test('cart is localized and normalized to one canonical target', () => {
    assert.match(script, /const label = lang === 'fa' \? 'سبد کالا' : 'CART';/);
    assert.match(script, /customer\.html#cart/);
    assert.match(script, /data-cart-label/);
    assert.match(script, /candidates\.slice\(1\)\.forEach\(\(item\) => item\.remove\(\)\)/);
  });

  test('commerce discovery does not create a second cart runtime', () => {
    assert.equal((script.match(/function enforceHeaderCart\(/g) || []).length, 1);
    assert.equal((script.match(/function watchHeaderCart\(/g) || []).length, 1);
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}
