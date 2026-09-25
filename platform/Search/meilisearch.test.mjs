import test from 'node:test';
import assert from 'node:assert/strict';
import { createMeilisearchSearch } from './meilisearch.mjs';

test('search delegates only to Meilisearch and returns canonical result shape', async () => {
  const calls = [];
  const search = createMeilisearchSearch({
    baseUrl: 'http://127.0.0.1:7700/',
    apiKey: 'test-key',
    index: 'afaghx',
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return new Response(JSON.stringify({
        hits: [{ id: 'p1', title: 'Steel' }],
        estimatedTotalHits: 1,
        processingTimeMs: 2
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });

  const result = await search.search({ q: 'steel', category: 'metals', limit: 8 });
  assert.deepEqual(result.items, [{ id: 'p1', title: 'Steel' }]);
  assert.equal(result.source, 'meilisearch');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /indexes\/afaghx\/search$/);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.authorization, 'Bearer test-key');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.q, 'steel');
  assert.equal(body.filter, 'category = "metals"');
});

test('search fails closed when Meilisearch is unavailable', async () => {
  const search = createMeilisearchSearch({
    baseUrl: 'http://127.0.0.1:7700/',
    fetchImpl: async () => new Response(JSON.stringify({ message: 'down' }), { status: 503 })
  });
  await assert.rejects(() => search.search({ q: 'steel' }), /down/);
});
