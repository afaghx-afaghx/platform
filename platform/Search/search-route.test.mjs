import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchRoute } from './search-route.mjs';

test('search route delegates to governed Meilisearch adapter', async () => {
  const calls = [];
  const route = createSearchRoute({
    search: async input => {
      calls.push(input);
      return { items: [{ id: 'p1', title: 'Steel' }], source: 'meilisearch' };
    }
  });
  let response;
  await route(new URL('http://localhost/v1/search?q=steel&category=metals'), 'req-1', (status, body) => {
    response = { status, body };
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.source, 'meilisearch');
  assert.deepEqual(calls, [{ q: 'steel', category: 'metals', limit: '20' }]);
});

test('search route rejects empty query without fabricating results', async () => {
  const route = createSearchRoute({ search: async () => { throw new Error('must not call search'); } });
  let response;
  await route(new URL('http://localhost/v1/search?q=&category=all'), 'req-2', (status, body) => {
    response = { status, body };
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'query_or_category_required');
});
