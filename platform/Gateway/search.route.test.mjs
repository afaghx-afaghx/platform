import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createCanonicalRuntime } from './runtime.mjs';

async function request(base, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(path, base), { method: 'GET' }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }));
    });
    req.on('error', reject);
    req.end();
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
  const server = runtime.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    const response = await request(`http://127.0.0.1:${address.port}`, '/v1/search?q=steel&category=metals');
    assert.equal(response.status, 200);
    assert.equal(response.body.source, 'meilisearch');
    assert.deepEqual(response.body.items, [{ id: 'p1', title: 'Steel' }]);
    assert.deepEqual(calls, [{ q: 'steel', category: 'metals', limit: '20' }]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('gateway search route rejects an empty query without fabricating results', async () => {
  const runtime = createCanonicalRuntime({
    core: { authenticateAccessToken: async () => null, authorize: async () => false },
    search: { search: async () => { throw new Error('must not call search'); } }
  });
  const server = runtime.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    const response = await request(`http://127.0.0.1:${address.port}`, '/v1/search?q=&category=all');
    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'query_or_category_required');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
