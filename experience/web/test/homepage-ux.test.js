import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../public/', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('afaghx-home-redesign-v1.css', root), 'utf8');

test('homepage has one discovery hero and one taxonomy section in the correct order', () => {
  assert.equal((html.match(/<section class="hero" id="discover">/g) || []).length, 1);
  assert.equal((html.match(/<section class="section" id="taxonomy">/g) || []).length, 1);
  assert.ok(html.indexOf('<section class="hero" id="discover">') < html.indexOf('<section class="section" id="taxonomy">'));
  assert.ok(html.includes('aria-label="ناوبری اصلی"'));
  assert.ok(html.includes('role="search"'));
  assert.ok(html.includes('id="search-form"'));
  assert.ok(html.includes('id="hero-intent-form"'));
  assert.ok(html.includes('id="taxonomy-families"'));
});

test('homepage keeps the ecosystem paths visible in primary navigation', () => {
  for (const path of ['#taxonomy', './customer.html', './supplier.html', './factory.html', './partner.html', './business.html']) {
    assert.ok(html.includes(path), `missing primary path: ${path}`);
  }
});

test('homepage UX layer includes responsive, keyboard and reduced-motion support', () => {
  assert.ok(html.includes('afaghx-home-redesign-v1.css'));
  assert.ok(css.includes('@media(max-width:760px)'));
  assert.ok(css.includes(':focus-visible'));
  assert.ok(css.includes('prefers-reduced-motion:reduce'));
});
