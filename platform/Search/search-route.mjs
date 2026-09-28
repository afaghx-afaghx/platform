export function createSearchRoute(searchService) {
  if (!searchService || typeof searchService.search !== 'function') throw new Error('search_service_required');

  return async function handleSearch(url, securityContext, requestId, sendJson) {
    if (!securityContext) {
      return sendJson(401, { error: 'missing_security_context', requestId });
    }
    if (securityContext.rbac?.allowed !== true) {
      return sendJson(403, { error: 'forbidden', reason: 'RBAC_DENIED', requestId });
    }
    if (securityContext.policy?.effect !== 'allow') {
      return sendJson(403, {
        error: 'POLICY_DENIED',
        reason: securityContext.policy?.reason || 'SEARCH_POLICY_REQUIRED',
        requestId
      });
    }
    if (!securityContext.tenant?.tenantId) {
      return sendJson(403, { error: 'forbidden', reason: 'MISSING_TENANT_CONTEXT', requestId });
    }

    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || 'all';
    if (!q.trim() && category === 'all') {
      return sendJson(400, { error: 'query_or_category_required', requestId });
    }

    try {
      const result = await searchService.search({
        q,
        category,
        limit: url.searchParams.get('limit') || 20,
        securityContext
      });
      return sendJson(200, { ...result, requestId });
    } catch {
      return sendJson(503, { error: 'search_unavailable', requestId });
    }
  };
}
