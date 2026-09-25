import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanonicalRuntime } from './runtime.mjs';

function invoke(runtime, url) {
  return new Promise((resolve) => {
    const req = {
      method: 'GET',
      url,
      headers: {},
      socket: { remoteAddress: '127.0.0.1' }
    };
    const res = {
      statusCode: 0,
      headers: null,
      writeHead(status, headers) { this.statusCode = status; this.headers = headers; },
      end(body) { resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(body) }); }
    };
    runtime.handle(req, res);
  });
}

test('gateway search route delegates to governed Meilisearch adapter', async () => {
  const calls = [];
  const runtime = createCanonicalRuntime({
    core: { authenticateAccessToken: async () => null, authorize: async () => false },
    search: {
      search: async input => {
        calls.push(input);
        return { items: [{ id: 'p1', title: 'Steel' }], estimatedTotalHits: 1, processingTimeMs: 1, source: 'meilisearch' };
      }
    }
  });
  const response = await invoke(runtime, '/v1/search?q=steel&category=metals');
  assert.equal(response.status, 200);
  assert.equal(response.body.source, 'meilisearch');
  assert.deepEqual(response.body.items, [{ id: 'p1', title: 'Steel' }]);
  assert.deepEqual(calls, [{ q: 'steel', category: 'metals', limit: '20' }]);
});

test('gateway search route rejects an empty query without fabricating results', async () => {
  const runtime = createCanonicalRuntime({
    core: { authenticateAccessToken: async () => null, authorize: async () => false },
    search: { search: async () => { throw new Error('must not call search'); } }
  });
  const response = await invoke(runtime, '/v1/search?q=&category=all');
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'query_or_category_required');
});
