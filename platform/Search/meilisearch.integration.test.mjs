import test from 'node:test';
import assert from 'node:assert/strict';
import { createMeilisearchSearch } from './meilisearch.mjs';

const baseUrl = process.env.MEILISEARCH_URL;
const apiKey = process.env.MEILISEARCH_API_KEY;

test('live Meilisearch integration returns indexed AFAGHX record', { skip: !baseUrl }, async () => {
  const headers = { 'content-type': 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const index = `afaghx-evidence-${Date.now()}`;
  const base = new URL(baseUrl);
  const settingsUrl = new URL(`indexes/${encodeURIComponent(index)}/settings/filterable-attributes`, base);
  const settings = await fetch(settingsUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(['category'])
  });
  assert.ok(settings.ok, `settings failed: ${settings.status}`);

  const indexUrl = new URL(`indexes/${encodeURIComponent(index)}/documents?primaryKey=id`, base);
  const seed = await fetch(indexUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify([{ id: 'evidence-1', title: 'AFAGHX Steel', category: 'metals', description: 'Evidence record' }])
  });
  assert.ok(seed.ok, `seed failed: ${seed.status}`);
  const search = createMeilisearchSearch({ baseUrl, apiKey, index });
  let result;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    result = await search.search({ q: 'AFAGHX Steel', category: 'metals', limit: 5 });
    if (result.items.some(item => item.id === 'evidence-1')) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(result.source, 'meilisearch');
  assert.ok(result.items.some(item => item.id === 'evidence-1'), 'indexed record was not searchable');
});
