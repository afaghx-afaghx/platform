import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PRODUCT_TAXONOMY } from '../public/product-taxonomy.js';

const ROOT = new URL('../public/', import.meta.url);
const read = async (name) => readFile(new URL(name, ROOT), 'utf8');

const files = {
  html: await read('index.html'),
  english: await read('en.html'),
  runtime: await read('home-v5.js'),
  discovery: await read('commerce-discovery-v1.js'),
  styles: await read('commerce-discovery-v1.css'),
  contract: await read('../../../docs/contracts/commerce-discovery-v1.md'),
  taxonomy: await read('product-taxonomy.js'),
};

test('COMMERCE-DISCOVERY-01: live discovery runtime exists and is mounted', () => {
  assert.match(files.runtime, /commerce-discovery-v1\.js/);
  assert.match(files.discovery, /id = 'commerce-discovery'/);
  assert.match(files.discovery, /COMMERCE DISCOVERY/);
  assert.match(files.styles, /\.commerce-discovery/);
});

test('COMMERCE-DISCOVERY-02: canonical API boundary is enforced', () => {
  assert.match(files.discovery, /https:\/\/api\.afaghx\.com/);
  assert.match(files.discovery, /\/v1\/search/);
  assert.doesNotMatch(files.discovery, /new AfxCore|PersistentAfxCore|DATABASE_URL|postgres/i);
});

test('COMMERCE-DISCOVERY-03: approved taxonomy remains exactly 34 baskets', () => {
  assert.equal(PRODUCT_TAXONOMY.length, 34);
  assert.equal(new Set(PRODUCT_TAXONOMY.map(([slug]) => slug)).size, 34);
  assert.doesNotMatch(files.taxonomy, /PRODUCT_PARENT_CATEGORIES/);
  assert.doesNotMatch(files.html, /<optgroup/);
  assert.doesNotMatch(files.english, /<optgroup/);
});

test('COMMERCE-DISCOVERY-04: no fabricated catalog data is embedded', () => {
  assert.match(files.discovery, /No fabricated data|هیچ داده ساختگی/);
  assert.doesNotMatch(files.discovery, /\$\s*\d|€\s*\d|rating\s*[:=]\s*[0-9]|price\s*[:=]\s*[0-9]/i);
  assert.doesNotMatch(files.discovery, /fake|mock|dummy|placeholder product/i);
});

test('COMMERCE-DISCOVERY-05: loading, empty and unavailable states exist', () => {
  assert.match(files.discovery, /در حال جست‌وجوی داده واقعی|Searching live data/);
  assert.match(files.discovery, /نتیجه‌ای پیدا نشد|No live result/);
  assert.match(files.discovery, /نتیجه زنده در دسترس نیست|Live results are unavailable/);
});

test('COMMERCE-DISCOVERY-06: result rendering is escaped', () => {
  assert.match(files.discovery, /escapeHtml/);
  assert.match(files.discovery, /escapeHtml\(title\)/);
  assert.match(files.discovery, /escapeHtml\(description\)/);
  assert.match(files.discovery, /escapeHtml\(type\)/);
});

test('COMMERCE-DISCOVERY-07: contract is present and fail-closed', () => {
  assert.match(files.contract, /Commerce Discovery Contract v1\.0/);
  assert.match(files.contract, /Anti-fabrication rule/);
  assert.match(files.contract, /GREEN only when CI proves/);
});
