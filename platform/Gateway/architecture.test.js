import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const server = fs.readFileSync(path.join(dir, 'server.js'), 'utf8');
const migrate = fs.readFileSync(path.join(dir, 'migrate.js'), 'utf8');

test('Gateway runtime does not execute database migrations during startup', () => {
  assert.doesNotMatch(server, /\.migrate\(\)/);
  assert.doesNotMatch(server, /migrate/);
});

test('Database migrations have an explicit standalone runner', () => {
  assert.match(migrate, /repository\.migrate\(\)/);
  assert.match(migrate, /DATABASE_URL_required/);
});
