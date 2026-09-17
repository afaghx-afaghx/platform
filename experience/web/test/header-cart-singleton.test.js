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
  const faHtml = await (await fetch(`${base}/index.html`)).text();
  const enHtml = await (await fetch(`${base}/en.html`)).text();

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

  test('inactive utility basket is removed from the DOM', () => {
    assert.match(script, /utility-inner > span/);
    assert.match(script, /۳۴\\s\*سبد\\s\*کالای\\s\*اصلی/);
    assert.match(script, /34\\s\*approved\\s\*product\\s\*baskets/);
    assert.match(script, /item\.remove\(\)/);
  });

  test('inactive basket is absent from the shipped header markup', () => {
    assert.doesNotMatch(faHtml, /<span>۳۴\s*سبد\s*کالای\s*اصلی<\/span>/);
    assert.doesNotMatch(enHtml, /<span>34\s*approved\s*product\s*baskets<\/span>/);
    assert.match(faHtml, /<header class="site-header">/);
    assert.match(enHtml, /<header class="site-header">/);
  });

  test('commerce discovery does not create a second cart runtime', () => {
    assert.equal((script.match(/function enforceHeaderCart\(/g) || []).length, 1);
    assert.equal((script.match(/function watchHeaderCart\(/g) || []).length, 1);
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}