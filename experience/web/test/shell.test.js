import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const html = await readFile(path.join(root, 'public', 'index.html'), 'utf8');
const apiClient = await readFile(path.join(root, 'public', 'api-client.js'), 'utf8');

test('experience shell defines all primary role routes', () => {
  for (const role of ['customer', 'business', 'supplier', 'factory', 'partner']) {
    assert.match(html, new RegExp(`#/${role}`));
  }
});

test('experience shell points to the canonical AFAGHX API without embedding credentials', () => {
  assert.match(html, /apiBaseUrl:'https:\/\/api\.afaghx\.com'/);
  assert.match(html, /apiVersion:'v1'/);
  assert.doesNotMatch(html, /(api[_-]?key|authorization\s*[:=]|bearer\s+[A-Za-z0-9._-]{10,})/i);
});

test('experience shell explicitly preserves the Core and Domain boundary', () => {
  assert.match(html, /Experience owns/);
  assert.match(html, /Core \/ Domain own/);
  assert.match(html, /delegated to AFAGHX Core/);
});

test('experience shell loads the governed API client and does not store credentials', () => {
  assert.match(html, /\.\/api-client\.js/);
  assert.match(apiClient, /https:\/\/api\.afaghx\.com/);
  assert.match(apiClient, /getAuthContext/);
  assert.match(apiClient, /UnauthorizedError/);
  assert.match(apiClient, /ForbiddenError/);
  assert.doesNotMatch(apiClient, /(localStorage|sessionStorage|document\.cookie)/);
  assert.doesNotMatch(apiClient, /Bearer\s+[A-Za-z0-9._-]{10,}/);
});
