function bearerValue(authorization = '') {
  const match = /^Bearer\s+(\S+)$/i.exec(String(authorization));
  return match?.[1] || null;
}

function safeProduct(record) {
  const data = record?.data || {};
  return Object.freeze({
    id: record.id,
    status: record.state,
    name: data.name,
    slug: data.slug ?? null,
    category: data.category ?? null,
    description: data.description ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
}

export function createProductQuery({ core, repository } = {}) {
  if (!core || !repository || typeof repository.findById !== 'function') {
    throw new Error('product_query_dependencies_required');
  }

  return async function getProduct({ authorization = '', id } = {}) {
    const token = bearerValue(authorization);
    if (!token) return { status: 401, body: { error: 'missing_or_invalid_bearer_token' } };

    let context;
    try {
      context = await core.authenticateAccessToken(token);
    } catch {
      return { status: 401, body: { error: 'invalid_access_token' } };
    }

    const allowed = await core.authorize(context, 'domain:product:read', context.tenantId);
    if (!allowed) return { status: 403, body: { error: 'forbidden' } };

    if (!id || !/^[A-Za-z0-9._:-]{1,160}$/.test(id)) {
      return { status: 404, body: { error: 'not_found' } };
    }

    const record = await repository.findById('product', id);
    if (!record || record.data?.tenantId !== context.tenantId || record.state !== 'active') {
      return { status: 404, body: { error: 'not_found' } };
    }

    return { status: 200, body: safeProduct(record) };
  };
}
