import { assertDomain, createDomainRecord, transitionDomainRecord } from './domain-runtime.mjs';

const METHODS = new Set(['GET', 'POST']);

function jsonError(status, code) { return { status, body: { error: code } }; }

async function readBody(request) {
  if (!request.body) return {};
  if (typeof request.body === 'object') return request.body;
  try { return JSON.parse(request.body); } catch { throw Object.assign(new Error('invalid_json'), { status: 400 }); }
}

function contextValues(context) {
  return {
    userId: context?.identity?.userId ?? context?.userId ?? null,
    tenantId: context?.tenant?.tenantId ?? context?.tenantId ?? null
  };
}

function contextAllowed(context) {
  if (!context) return false;
  if (context.rbac && context.rbac.allowed !== true) return false;
  if (context.policy && context.policy.effect !== 'allow') return false;
  return true;
}

export function createDomainApi({ repository, idempotency, audit = async () => {}, clock = () => new Date() }) {
  if (!repository) throw new Error('domain_api_dependencies_required');

  return async function handle(request) {
    if (!METHODS.has(request.method)) return jsonError(405, 'method_not_allowed');
    const url = new URL(request.url || '/', 'http://afaghx.local');
    const match = url.pathname.match(/^/v1/domains/([a-z-]+)(?:/([^/]+))?(?:/transition)?$/);
    if (!match) return jsonError(404, 'not_found');
    const domain = match[1];
    try { assertDomain(domain); } catch { return jsonError(404, 'unknown_domain'); }

    const securityContext = request.securityContext;
    const { userId, tenantId } = contextValues(securityContext);
    if (!tenantId || !userId) return jsonError(401, 'missing_security_context');
    if (!contextAllowed(securityContext)) return jsonError(403, 'forbidden');

    const id = match[2];
    const isTransition = url.pathname.endsWith('/transition');

    try {
      if (request.method === 'GET' && id) {
        const record = await repository.findById(domain, id);
        if (!record || record.data?.tenantId !== tenantId) return jsonError(404, 'not_found');
        return { status: 200, body: record };
      }
      if (request.method === 'POST' && !id) {
        const body = await readBody(request);
        if (body.tenantId && body.tenantId !== tenantId) return jsonError(403, 'tenant_mismatch');
        const payload = { ...body, tenantId };
        const key = request.headers?.['idempotency-key'];
        if (!key) return jsonError(400, 'idempotency_key_required');
        if (idempotency) {
          const existing = await idempotency.get(tenantId, key);
          if (existing) return existing;
        }
        const record = createDomainRecord(domain, payload, clock());
        await repository.insert(domain, record);
        const response = { status: 201, body: record };
        if (idempotency) await idempotency.put(tenantId, key, response);
        await audit({ type: 'domain.record.created', domain, recordId: record.id, tenantId, userId });
        return response;
      }
      if (request.method === 'POST' && id && isTransition) {
        const body = await readBody(request);
        const existing = await repository.findById(domain, id);
        if (!existing || existing.data?.tenantId !== tenantId) return jsonError(404, 'not_found');
        const record = transitionDomainRecord(existing, body.state, clock());
        await repository.updateState(domain, id, record.state, record.updatedAt);
        await audit({ type: 'domain.record.transitioned', domain, recordId: id, state: record.state, tenantId, userId });
        return { status: 200, body: record };
      }
      return jsonError(404, 'not_found');
    } catch (error) {
      if (error.status) return jsonError(error.status, error.message);
      if (error.message === 'invalid_payload' || error.message === 'invalid_amount' || error.message === 'invalid_currency') return jsonError(422, error.message);
      if (error.message === 'invalid_state_transition') return jsonError(409, error.message);
      throw error;
    }
  };
}

export function createMemoryIdempotencyStore() {
  const entries = new Map();
  return {
    async get(tenantId, key) { return entries.get(`${tenantId}:${key}`) ?? null; },
    async put(tenantId, key, response) { entries.set(`${tenantId}:${key}`, response); }
  };
}
