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
  const indexUrl = new URL(`indexes/${encodeURIComponent(index)}/documents?primaryKey=id`, base);
  const seed = await fetch(indexUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify([{ id: 'evidence-1', title: 'AFAGHX Steel', category: 'metals', description: 'Evidence record' }])
  });
  assert.ok(seed.ok, `seed failed: ${seed.status}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  const search = createMeilisearchSearch({ baseUrl, apiKey, index });
  const result = await search.search({ q: 'AFAGHX Steel', category: 'metals', limit: 5 });
  assert.equal(result.source, 'meilisearch');
  assert.equal(result.items[0].id, 'evidence-1');
});
