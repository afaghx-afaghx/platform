import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'experience/web/public');

async function read(name) {
  return fs.readFile(path.join(root, name), 'utf8');
}

test('commercial homepage assets exist and expose sectioned commerce discovery', async () => {
  const css = await read('commercial-homepage.css');
  const js = await read('commercial-homepage.js');
  assert.match(css, /\.category-rail/);
  assert.match(css, /\.product-grid/);
  assert.match(css, /\.supplier-grid/);
  assert.match(js, /featured/);
  assert.match(js, /best/);
  assert.match(js, /newArrivals/);
  assert.match(js, /categoriesRails/);
  assert.match(js, /TOP SUPPLIERS/);
});

test('commercial homepage is explicitly prototype-safe', async () => {
  const js = await read('commercial-homepage.js');
  assert.match(js, /Prototype content is clearly marked/);
  assert.match(js, /Quote requested/);
  assert.match(js, /Preview/);
});

test('pages workflow attaches the commercial homepage assets', async () => {
  const workflow = await fs.readFile(path.resolve(process.cwd(), '.github/workflows/afaghx-pages.yml'), 'utf8');
  assert.match(workflow, /commercial-homepage\.css/);
  assert.match(workflow, /commercial-homepage\.js/);
});
