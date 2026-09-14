import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

test('canonical API uses PersistentAfxCore and Postgres repository', () => {
  assert.match(source, /PersistentAfxCore/);
  assert.match(source, /PostgresAfxCoreRepository/);
  assert.match(source, /DATABASE_URL/);
  assert.match(source, /core\.migrate\(\)/);
});

test('canonical API does not instantiate or import the in-memory AfxCore module', () => {
  assert.doesNotMatch(source, /new\s+AfxCore\s*\(/);
  assert.doesNotMatch(source, /from\s+["'][^"']*\/core\.js["']/);
});

test('canonical API defines the versioned authentication contracts', () => {
  assert.match(source, /const\s+API_PREFIX\s*=\s*["']\/v1["']/);
  assert.match(source, /\$\{API_PREFIX\}\/auth\/login/);
  assert.match(source, /\$\{API_PREFIX\}\/auth\/(?:context|me)/);
  assert.match(source, /\$\{API_PREFIX\}\/auth\/refresh/);
  assert.match(source, /\$\{API_PREFIX\}\/auth\/logout/);
});
