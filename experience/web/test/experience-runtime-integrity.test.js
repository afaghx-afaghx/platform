import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PUBLIC = new URL('../public/', import.meta.url);

function localTarget(value) {
  if (!value || value.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return null;
  return value.split('#')[0].split('?')[0];
}

test('Experience HTML assets and navigation targets are real files', () => {
  const htmlFiles = fs.readdirSync(PUBLIC, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
    .map(entry => entry.name);
  for (const name of htmlFiles) {
    const html = fs.readFileSync(new URL(name, PUBLIC), 'utf8');
    for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      const target = localTarget(match[1]);
      if (!target) continue;
      const resolved = target.startsWith('/')
        ? new URL('.' + target, PUBLIC)
        : new URL(target, new URL(name, PUBLIC));
      assert.ok(fs.existsSync(resolved), `${name} references missing local target: ${match[1]}`);
    }
  }
});

test('canonical homepage does not reintroduce retired UI generations', () => {
  const retired = [
    'afaghx-home-premium-v2.css',
    'afaghx-home-premium-v3.css',
    'afaghx-home-premium-v4.css',
    'afaghx-home-premium-v5.css',
    'afaghx-home-premium-v6.css',
    'afaghx-language-system.js',
  ];
  for (const name of retired) {
    assert.equal(fs.existsSync(new URL(name, PUBLIC)), false, `retired file still exists: ${name}`);
  }
  for (const name of ['index.html', 'en/index.html']) {
    const html = fs.readFileSync(new URL(name, PUBLIC), 'utf8');
    for (const retiredName of retired) assert.doesNotMatch(html, new RegExp(retiredName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('Experience test command remains Node-native and deterministic', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.test, 'node --test test/*.test.js');
  assert.equal(pkg.engines.node, '>=20');
});
