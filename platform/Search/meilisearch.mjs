import { URL } from 'node:url';

function normalizeUrl(value) {
  if (!value) throw new Error('meilisearch_url_required');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('meilisearch_url_invalid');
  return url;
}

function filterValue(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\\"');
}

export function createMeilisearchSearch({
  baseUrl = process.env.MEILISEARCH_URL,
  apiKey = process.env.MEILISEARCH_API_KEY,
  index = process.env.MEILISEARCH_INDEX || 'afaghx',
  fetchImpl = fetch,
  timeoutMs = 5000
} = {}) {
  const base = normalizeUrl(baseUrl);
  const headers = { accept: 'application/json', 'content-type': 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  async function search({ q = '', category = 'all', limit = 20, securityContext } = {}) {
    const tenantId = securityContext?.tenant?.tenantId;
    if (!tenantId) throw new Error('missing_security_context_tenant');

    const query = String(q).trim();
    const filters = [`tenant_id = "${filterValue(tenantId)}"`];
    if (category && category !== 'all') {
      filters.push(`category = "${filterValue(category)}"`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(new URL(`indexes/${encodeURIComponent(index)}/search`, base), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          q: query,
          filter: filters.join(' AND '),
          limit: Math.min(Math.max(Number(limit) || 20, 1), 100)
        }),
        signal: controller.signal
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(body.message || `meilisearch_http_${response.status}`);
        error.statusCode = response.status >= 500 ? 503 : 502;
        throw error;
      }
      return Object.freeze({
        items: Array.isArray(body.hits) ? body.hits : [],
        estimatedTotalHits: Number(body.estimatedTotalHits || 0),
        processingTimeMs: Number(body.processingTimeMs || 0),
        source: 'meilisearch'
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({ search });
}
