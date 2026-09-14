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

test('canonical API does not instantiate in-memory AfxCore', () => {
  assert.doesNotMatch(source, /new\s+AfxCore\s*\(/);
  assert.doesNotMatch(source, /from .*core\.js/);
});

test('canonical API exposes versioned authentication contracts', () => {
  assert.match(source, /\/v1\/auth\/login/);
  assert.match(source, /\/v1\/auth\/(?:context|me)/);
  assert.match(source, /\/v1\/auth\/refresh/);
  assert.match(source, /\/v1\/auth\/logout/);
});
