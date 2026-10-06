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

export function createProductQuery({ repository } = {}) {
  if (!repository || typeof repository.findById !== 'function') {
    throw new Error('product_query_dependencies_required');
  }

  return async function getProduct({ securityContext, id } = {}) {
    if (!securityContext?.userId || !securityContext?.tenantId) {
      return { status: 401, body: { error: 'missing_security_context' } };
    }

    const tenantId = securityContext.tenantId;
    if (!id || !/^[A-Za-z0-9._:-]{1,160}$/.test(id)) {
      return { status: 404, body: { error: 'not_found' } };
    }

    const record = await repository.findById('product', id);
    if (!record || record.data?.tenantId !== tenantId || record.state !== 'active') {
      return { status: 404, body: { error: 'not_found' } };
    }

    return { status: 200, body: safeProduct(record) };
  };
}
