import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../public/', import.meta.url);
const read = (name) => readFile(new URL(name, ROOT), 'utf8');
const [html, css, runtime] = await Promise.all([
  read('buyer-center.html'),
  read('buyer-center.css'),
  read('buyer-center.js'),
]);

test('BUYER-01 P1: buyer dashboard is a presentation-only experience surface', () => {
  assert.match(html, /مرکز خریداران/);
  assert.match(html, /dir="rtl"/);
  assert.match(runtime, /https:\/\/api\.afaghx\.com/);
  assert.doesNotMatch(runtime + html, /DATABASE_URL|PersistentAfxCore|postgres(?:ql)?|new AfxCore/i);
});

test('BUYER-02 P2: identity is fetched only through canonical API with cookie credentials', () => {
  assert.match(runtime, /\/v1\/auth\/context/);
  assert.match(runtime, /credentials:\s*'include'/);
  assert.match(runtime, /cache:\s*'no-store'/);
  assert.match(runtime, /response\.status === 401/);
  assert.match(runtime, /response\.status === 403/);
  assert.doesNotMatch(runtime, /localStorage|sessionStorage|document\.cookie|Authorization\s*:/i);
});

test('BUYER-03 P3: no fabricated business facts or fake operational metrics', () => {
  assert.match(html, /هیچ داده نمونه‌ای به‌عنوان داده واقعی نمایش داده نمی‌شود/);
  assert.match(html, /داده عملیاتی هنوز متصل نشده است/);
  assert.match(html, /فقط با محاسبه مستند نمایش داده می‌شود/);
  assert.doesNotMatch(html, /TM-\d{3,}|RFQ-\d{3,}|\d{1,3}(?:,\d{3})+\s*(?:تومان|ریال)/);
  assert.doesNotMatch(runtime, /mock|fake|dummy|localStorage|sessionStorage/i);
});

test('BUYER-04 P4: responsive, accessible, and operable UI contracts exist', () => {
  assert.match(html, /id="main-content"/);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-label="ناوبری مرکز خریداران"/);
  assert.match(html, /id="menu-toggle"/);
  assert.match(html, /id="mobile-scrim"/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(runtime, /event\.key === 'Escape'/);
});

test('BUYER-05: quick actions, requests, quotes, orders and documents are represented', () => {
  for (const id of ['requests', 'quotes', 'orders', 'documents']) assert.match(html, new RegExp('id="' + id + '"'));
  assert.match(html, /href="\.\/baskets\.html"/);
  assert.match(html, /href="\.\/supplier\.html"/);
});

test('BUYER-06: dynamic identity labels use textContent and bounded strings', () => {
  assert.match(runtime, /textContent = userName/);
  assert.match(runtime, /textContent = orgName/);
  assert.match(runtime, /slice\(0, 100\)/);
  assert.doesNotMatch(runtime, /innerHTML\s*=/);
});
