import test from 'node:test';
import assert from 'node:assert/strict';
import { createMeilisearchSearch } from './meilisearch.mjs';

const baseUrl = process.env.MEILISEARCH_URL;
const apiKey = process.env.MEILISEARCH_API_KEY;

async function waitForTask(base, taskUid, headers) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(new URL('tasks/' + taskUid, base), { headers });
    const body = await response.json();
    if (body.status === 'succeeded') return body;
    if (body.status === 'failed') throw new Error(body.error?.message || 'meilisearch_task_failed');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('meilisearch_task_timeout');
}

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
  const settingsTask = await settings.json();
  await waitForTask(base, settingsTask.taskUid, headers);

  const indexUrl = new URL(`indexes/${encodeURIComponent(index)}/documents?primaryKey=id`, base);
  const seed = await fetch(indexUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify([{ id: 'evidence-1', title: 'AFAGHX Steel', category: 'metals', description: 'Evidence record' }])
  });
  assert.ok(seed.ok, `seed failed: ${seed.status}`);
  const seedTask = await seed.json();
  await waitForTask(base, seedTask.taskUid, headers);
  const search = createMeilisearchSearch({ baseUrl, apiKey, index });
  const result = await search.search({ q: 'AFAGHX Steel', category: 'metals', limit: 5 });
  assert.equal(result.source, 'meilisearch');
  assert.ok(result.items.some(item => item.id === 'evidence-1'), 'indexed record was not searchable');
});
