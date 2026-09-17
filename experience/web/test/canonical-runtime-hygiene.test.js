import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

 test('canonical Experience does not retain the unreferenced home-v3 runtime', () => {
  assert.equal(fs.existsSync(path.join(publicDir, 'home-v3.js')), false);
});

test('canonical homepage references the approved current experience assets', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /home-v5\.css/);
  assert.match(html, /home-v7-ecosystem\.css/);
  assert.doesNotMatch(html, /home-v3\.js/);
});
