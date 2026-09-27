const EFFECTS = Object.freeze(['deny']);

function cloneRoles(roles = []) {
  return Object.freeze([...new Set(roles)]);
}

function normalizePolicy(policy = {}) {
  if (!policy.id || typeof policy.id !== 'string') throw new Error('invalid_policy_id');
  if (policy.effect !== 'deny') throw new Error('invalid_policy_effect');
  if (!policy.permission || typeof policy.permission !== 'string') throw new Error('invalid_policy_permission');

  return Object.freeze({
    id: policy.id,
    effect: 'deny',
    permission: policy.permission,
    tenantId: policy.tenantId ?? null,
    subjectId: policy.subjectId ?? null,
    roles: cloneRoles(policy.roles),
    resourceStates: Object.freeze([...new Set(policy.resourceStates ?? [])]),
    reason: policy.reason ?? 'policy_denied',
    priority: Number.isInteger(policy.priority) ? policy.priority : 0,
    enabled: policy.enabled !== false
  });
}

export function createPolicyEvaluator({ listPolicies, clock = () => Date.now() } = {}) {
  if (typeof listPolicies !== 'function') throw new Error('policy_list_required');

  function matches(policy, context, { permission, resourceTenantId, resourceState } = {}) {
    if (!policy.enabled) return false;
    if (policy.effect !== 'deny') return false;
    if (policy.permission !== permission) return false;
    if (!context?.userId || !context?.tenantId) return false;
    if (resourceTenantId && context.tenantId !== resourceTenantId) return false;
    if (policy.tenantId && policy.tenantId !== context.tenantId) return false;
    if (policy.subjectId && policy.subjectId !== context.userId) return false;
    if (policy.roles.length && !policy.roles.some(role => context.roles?.includes(role))) return false;
    if (policy.resourceStates.length && !policy.resourceStates.includes(resourceState)) return false;
    return true;
  }

  function evaluateSync(context, request = {}) {
    const evaluatedAt = new Date(clock()).toISOString();

    if (!context?.userId || !context?.tenantId) {
      return Object.freeze({
        decision: 'deny',
        reasons: Object.freeze(['missing_security_context']),
        policyIds: Object.freeze([]),
        evaluatedAt
      });
    }

    if (request.resourceTenantId && context.tenantId !== request.resourceTenantId) {
      return Object.freeze({
        decision: 'deny',
        reasons: Object.freeze(['tenant_mismatch']),
        policyIds: Object.freeze([]),
        evaluatedAt
      });
    }

    const policies = listPolicies(context.tenantId)
      .map(normalizePolicy)
      .filter(policy => matches(policy, context, request))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

    const blocking = policies.filter(policy => policy.effect === 'deny');
    if (blocking.length) {
      return Object.freeze({
        decision: 'deny',
        reasons: Object.freeze(blocking.map(policy => policy.reason)),
        policyIds: Object.freeze(blocking.map(policy => policy.id)),
        evaluatedAt
      });
    }

    return Object.freeze({
      decision: 'allow',
      reasons: Object.freeze(['no_applicable_deny_policy']),
      policyIds: Object.freeze([]),
      evaluatedAt
    });
  }

  async function evaluate(context, request = {}) {
    return evaluateSync(context, request);
  }

  return Object.freeze({ evaluate, evaluateSync });
}

export { EFFECTS, normalizePolicy };
