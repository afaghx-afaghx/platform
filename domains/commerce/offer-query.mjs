function bearerValue(authorization = '') {
  const match = /^Bearer\s+(\S+)$/i.exec(String(authorization));
  return match?.[1] || null;
}

function safeOffer(row) {
  return Object.freeze({
    id: row.id,
    productId: row.productId,
    organizationId: row.organizationId,
    status: row.status,
    currency: row.currency,
    price: row.price,
    minimumOrderQuantity: row.minimumOrderQuantity ?? null,
    leadTimeDays: row.leadTimeDays ?? null,
    availabilityPolicy: row.availabilityPolicy ?? null,
    tradeTerms: row.tradeTerms ?? null,
    validFrom: row.validFrom ?? null,
    validUntil: row.validUntil ?? null
  });
}

export function createOfferQuery({ core, repository } = {}) {
  if (!core || !repository || typeof repository.findActiveByProduct !== 'function') throw new Error('offer_query_dependencies_required');
  return async function listOffers({ authorization = '', productId } = {}) {
    const token = bearerValue(authorization);
    if (!token) return { status: 401, body: { error: 'missing_or_invalid_bearer_token' } };
    let context;
    try { context = await core.authenticateAccessToken(token); } catch { return { status: 401, body: { error: 'invalid_access_token' } }; }
    if (!await core.authorize(context, 'domain:offer:read', context.tenantId)) return { status: 403, body: { error: 'forbidden' } };
    if (!productId || !/^[A-Za-z0-9._:-]{1,160}$/.test(productId)) return { status: 404, body: { error: 'not_found' } };
    const rows = await repository.findActiveByProduct(productId);
    const offers = [];
    for (const row of rows) {
      const organization = await core.getOrganization(row.organizationId);
      if (!organization || organization.tenantId !== context.tenantId || organization.status !== 'active') continue;
      offers.push(safeOffer(row));
    }
    return { status: 200, body: { items: offers } };
  };
}