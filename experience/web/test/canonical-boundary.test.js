import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const serverSource = await readFile(new URL('../server.js', import.meta.url), 'utf8');

test('experience server has no AfxCore production dependency', () => {
  assert.doesNotMatch(serverSource, /AfxCore/);
  assert.doesNotMatch(serverSource, /PersistentAfxCore/);
});

test('experience server proxies API traffic to the canonical API origin', () => {
  assert.match(serverSource, /AFAGHX_API_ORIGIN/);
  assert.match(serverSource, /\/v1\//);
  assert.match(serverSource, /x-afaghx-experience-boundary/);
});

test('dashboard authorization is delegated to canonical API session state', () => {
  assert.match(serverSource, /\/v1\/auth\/me/);
  assert.match(serverSource, /hasCanonicalSession/);
});
