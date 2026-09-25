function bearerValue(authorization = '') {
  const match = /^Bearer\s+(\S+)$/i.exec(String(authorization));
  return match?.[1] || null;
}

export function createAvailabilityQuery({ core, repository } = {}) {
  if (!core || !repository || typeof repository.findByOfferId !== 'function') throw new Error('availability_query_dependencies_required');
  return async function getAvailability({ authorization = '', offerId } = {}) {
    const token = bearerValue(authorization);
    if (!token) return { status: 401, body: { error: 'missing_or_invalid_bearer_token' } };
    let context;
    try { context = await core.authenticateAccessToken(token); } catch { return { status: 401, body: { error: 'invalid_access_token' } }; }
    if (!await core.authorize(context, 'domain:inventory:read', context.tenantId)) return { status: 403, body: { error: 'forbidden' } };
    if (!offerId || !/^[A-Za-z0-9._:-]{1,160}$/.test(offerId)) return { status: 404, body: { error: 'not_found' } };
    const row = await repository.findByOfferId(offerId);
    if (!row || row.tenantId !== context.tenantId) return { status: 404, body: { error: 'not_found' } };
    return { status: 200, body: Object.freeze({ offerId: row.offerId, status: row.status, availableQuantity: row.availableQuantity, updatedAt: row.updatedAt }) };
  };
}