export function createSearchRoute(searchService) {
  if (!searchService || typeof searchService.search !== 'function') throw new Error('search_service_required');
  return async function handleSearch(url, requestId, sendJson) {
    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || 'all';
    if (!q.trim() && category === 'all') {
      return sendJson(400, { error: 'query_or_category_required', requestId });
    }
    try {
      const result = await searchService.search({
        q,
        category,
        limit: url.searchParams.get('limit') || 20
      });
      return sendJson(200, { ...result, requestId });
    } catch {
      return sendJson(503, { error: 'search_unavailable', requestId });
    }
  };
}
