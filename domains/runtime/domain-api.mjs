import { createHash } from 'node:crypto';
import { assertDomain, createDomainRecord, transitionDomainRecord } from './domain-runtime.mjs';

const METHODS = new Set(['GET', 'POST']);
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;

function jsonError(status, code) { return { status, body: { error: code } }; }

async function readBody(request) {
  if (!request.body) return {};
  if (typeof request.body === 'object') return request.body;
  try { return JSON.parse(request.body); } catch { throw Object.assign(new Error('invalid_json'), { status: 400 }); }
}

function permission(domain, action) { return `domain:${domain}:${action}`; }

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function requestFingerprint(domain, payload) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize({ method: 'POST', domain, payload })))
    .digest('hex');
}

export function createDomainApi({ core, repository, idempotency, audit = async () => {}, clock = () => new Date() }) {
  if (!core || !repository) throw new Error('domain_api_dependencies_required');

  return async function handle(request) {
    if (!METHODS.has(request.method)) return jsonError(405, 'method_not_allowed');
    const url = new URL(request.url || '/', 'http://afaghx.local');
    const match = url.pathname.match(/^\/v1\/domains\/([a-z-]+)(?:\/([^/]+))?(?:\/transition)?$/);
    if (!match) return jsonError(404, 'not_found');
    const domain = match[1];
    try { assertDomain(domain); } catch { return jsonError(404, 'unknown_domain'); }

    let context;
    try {
      const authorization = request.headers?.authorization || '';
      if (!authorization.startsWith('Bearer ')) return jsonError(401, 'unauthorized');
      context = await core.authenticateAccessToken(authorization.slice(7));
    } catch { return jsonError(401, 'unauthorized'); }

    if (!context?.userId || !context?.tenantId) return jsonError(401, 'invalid_security_context');

    const id = match[2];
    const isTransition = url.pathname.endsWith('/transition');
    const action = request.method === 'GET' ? 'read' : 'write';
    if (!(await core.authorize(context, permission(domain, action), context.tenantId))) return jsonError(403, 'forbidden');

    try {
      if (request.method === 'GET' && id) {
        const record = await repository.findById(domain, id, context.tenantId);
        if (!record || record.data?.tenantId !== context.tenantId) return jsonError(404, 'not_found');
        return { status: 200, body: record };
      }

      if (request.method === 'POST' && !id) {
        const body = await readBody(request);
        if (!body || Array.isArray(body) || typeof body !== 'object') return jsonError(400, 'invalid_json');
        if (body.tenantId && body.tenantId !== context.tenantId) return jsonError(403, 'tenant_mismatch');

        const key = request.headers?.['idempotency-key'] ?? request.headers?.['Idempotency-Key'];
        if (typeof key !== 'string' || !IDEMPOTENCY_KEY_PATTERN.test(key)) {
          return jsonError(400, 'invalid_idempotency_key');
        }
        if (typeof idempotency?.execute !== 'function') return jsonError(503, 'idempotency_unavailable');

        const payload = { ...body, tenantId: context.tenantId };
        const fingerprint = requestFingerprint(domain, payload);
        const record = createDomainRecord(domain, payload, clock());
        const outcome = await idempotency.execute(
          context.tenantId,
          key,
          fingerprint,
          async (transaction) => {
            await repository.insert(domain, record, transaction);
            return { status: 201, body: record };
          }
        );

        if (!outcome.replayed) {
          await audit({
            type: 'domain.record.created',
            domain,
            recordId: record.id,
            tenantId: context.tenantId,
            userId: context.userId
          });
        }
        return outcome.response;
      }

      if (request.method === 'POST' && id && isTransition) {
        const body = await readBody(request);
        const existing = await repository.findById(domain, id, context.tenantId);
        if (!existing || existing.data?.tenantId !== context.tenantId) return jsonError(404, 'not_found');
        const record = transitionDomainRecord(existing, body.state, clock());
        await repository.updateState(domain, id, record.state, record.updatedAt, context.tenantId, existing.state);
        await audit({
          type: 'domain.record.transitioned',
          domain,
          recordId: id,
          state: record.state,
          tenantId: context.tenantId,
          userId: context.userId
        });
        return { status: 200, body: record };
      }

      return jsonError(404, 'not_found');
    } catch (error) {
      if (error.status) return jsonError(error.status, error.message);
      if (error.message === 'tenant_context_required' || error.message === 'invalid_security_context') {
        return jsonError(401, error.message);
      }
      if (error.message?.startsWith('required_field:') || error.message === 'invalid_payment_amount' || error.message === 'invalid_payment_currency') {
        return jsonError(422, error.message);
      }
      if (error.message?.startsWith('invalid_transition:') || error.message === 'idempotency_key_reused' || error.message === 'domain_record_changed_or_not_found') {
        return jsonError(409, error.message);
      }
      if (error.message === 'idempotency_in_progress' || error.message === 'idempotency_unavailable') {
        return jsonError(503, error.message);
      }
      throw error;
    }
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createMemoryIdempotencyStore() {
  const entries = new Map();
  const pending = new Map();

  return Object.freeze({
    async execute(tenantId, key, requestHash, operation) {
      const entryKey = JSON.stringify([tenantId, key]);
      const existing = entries.get(entryKey);
      if (existing) {
        if (existing.requestHash !== requestHash) throw Object.assign(new Error('idempotency_key_reused'), { status: 409 });
        return { response: clone(existing.response), replayed: true };
      }

      const active = pending.get(entryKey);
      if (active) {
        if (active.requestHash !== requestHash) throw Object.assign(new Error('idempotency_key_reused'), { status: 409 });
        const response = await active.promise;
        return { response: clone(response), replayed: true };
      }

      const promise = Promise.resolve().then(() => operation(null));
      pending.set(entryKey, { requestHash, promise });
      try {
        const response = await promise;
        entries.set(entryKey, { requestHash, response: clone(response) });
        return { response, replayed: false };
      } finally {
        pending.delete(entryKey);
      }
    }
  });
}
