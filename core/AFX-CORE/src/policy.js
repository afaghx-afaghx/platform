const EFFECTS = Object.freeze(['allow', 'deny']);

function cloneArray(values = []) {
  return Object.freeze([...new Set(Array.isArray(values) ? values : [])]);
}

function getPath(root, path) {
  return String(path).split('.').reduce((value, key) => value == null ? undefined : value[key], root);
}

function matchCondition(condition, context, resource) {
  const actual = getPath({ context, resource }, condition.attribute);
  switch (condition.operator) {
    case 'eq': return actual === condition.value;
    case 'neq': return actual !== condition.value;
    case 'in': return Array.isArray(condition.value) && condition.value.includes(actual);
    case 'nin': return Array.isArray(condition.value) && !condition.value.includes(actual);
    case 'gt': return actual > condition.value;
    case 'lt': return actual < condition.value;
    default: return false;
  }
}

function matchConditions(conditions = [], context, resource) {
  return conditions.every(condition => matchCondition(condition, context, resource));
}

function matchSubject(subject = {}, context) {
  const userIds = cloneArray(subject.userIds);
  const roles = cloneArray(subject.roles);
  const userMatches = userIds.length === 0 || userIds.includes(context.userId);
  const roleMatches = roles.length === 0
    ? true
    : subject.requireAll
      ? roles.every(role => context.roles?.includes(role))
      : roles.some(role => context.roles?.includes(role));
  return userMatches && roleMatches;
}

function matchResource(resourceRule = {}, resource, context) {
  if (!resource || resourceRule.type !== resource.type) return false;
  if (resourceRule.tenantScoped !== false && resource.tenantId !== context.tenantId) return false;
  const ids = cloneArray(resourceRule.ids);
  if (ids.length && !ids.includes(resource.id)) return false;
  return true;
}

function normalizeRule(rule = {}) {
  if (!rule.action || typeof rule.action !== 'string') throw new Error('invalid_policy_rule_action');
  if (!EFFECTS.includes(rule.effect)) throw new Error('invalid_policy_rule_effect');
  if (!rule.reason || typeof rule.reason !== 'string') throw new Error('invalid_policy_rule_reason');
  const resource = rule.resource ?? {};
  if (!resource.type || typeof resource.type !== 'string') throw new Error('invalid_policy_rule_resource');
  return Object.freeze({
    subject: Object.freeze({
      userIds: cloneArray(rule.subject?.userIds),
      roles: cloneArray(rule.subject?.roles),
      requireAll: rule.subject?.requireAll === true
    }),
    resource: Object.freeze({
      type: resource.type,
      ids: cloneArray(resource.ids),
      tenantScoped: resource.tenantScoped !== false
    }),
    action: rule.action,
    conditions: Object.freeze(Array.isArray(rule.conditions) ? rule.conditions.map(c => Object.freeze({ ...c })) : []),
    effect: rule.effect,
    reason: rule.reason
  });
}

function normalizePolicy(policy = {}) {
  if (!policy.id || typeof policy.id !== 'string') throw new Error('invalid_policy_id');
  if (!policy.tenantId || typeof policy.tenantId !== 'string') throw new Error('invalid_policy_tenant');
  if (!policy.name || typeof policy.name !== 'string') throw new Error('invalid_policy_name');
  if (!Array.isArray(policy.rules) || policy.rules.length === 0) throw new Error('invalid_policy_rules');
  return Object.freeze({
    id: policy.id,
    tenantId: policy.tenantId,
    name: policy.name,
    description: policy.description ?? '',
    rules: Object.freeze(policy.rules.map(normalizeRule)),
    priority: Number.isInteger(policy.priority) ? policy.priority : 0,
    active: policy.active !== false
  });
}

function decision(context, resource, action, effect, reason, policyId, evaluatedAt) {
  return Object.freeze({
    effect,
    reason,
    policyId: policyId ?? null,
    evaluatedAt,
    inputs: Object.freeze({
      subject: Object.freeze({
        userId: context.userId,
        roles: Object.freeze([...(context.roles ?? [])]),
        tenantId: context.tenantId
      }),
      resource: Object.freeze({ ...resource }),
      action
    })
  });
}

export function createPolicyEvaluator({ listPolicies, clock = () => Date.now() } = {}) {
  if (typeof listPolicies !== 'function') throw new Error('policy_list_required');

  async function evaluate(context, resource = {}, action = '') {
    return evaluateFromPolicies(context, resource, action, await listPolicies(context?.tenantId));
  }

  function evaluateSync(context, resource = {}, action = '') {
    return evaluateFromPolicies(context, resource, action, listPolicies(context?.tenantId));
  }

  function evaluateFromPolicies(context, resource, action, rawPolicies) {
    const evaluatedAt = new Date(clock()).toISOString();

    if (!context?.userId || !context?.tenantId) {
      return decision(context ?? {}, resource, action, 'deny', 'MISSING_SECURITY_CONTEXT', null, evaluatedAt);
    }
    if (!resource?.tenantId || resource.tenantId !== context.tenantId) {
      return decision(context, resource, action, 'deny', 'TENANT_MISMATCH', null, evaluatedAt);
    }

    const policies = rawPolicies
      .filter(policy => policy?.active !== false)
      .map(normalizePolicy)
      .filter(policy => policy.tenantId === context.tenantId)
      .sort((a, b) => b.priority - a.priority || b.rules.some(rule => rule.effect === 'deny') - a.rules.some(rule => rule.effect === 'deny') || a.id.localeCompare(b.id));

    const matches = [];
    for (const policy of policies) {
      for (let index = 0; index < policy.rules.length; index += 1) {
        const rule = policy.rules[index];
        if (!matchSubject(rule.subject, context)) continue;
        if (!matchResource(rule.resource, resource, context)) continue;
        if (rule.action !== action) continue;
        if (!matchConditions(rule.conditions, context, resource)) continue;
        matches.push({ policy, rule, index });
      }
    }

    matches.sort((a, b) => {
      if (b.policy.priority !== a.policy.priority) return b.policy.priority - a.policy.priority;
      if (a.rule.effect !== b.rule.effect) return a.rule.effect === 'deny' ? -1 : 1;
      if (a.policy.id !== b.policy.id) return a.policy.id.localeCompare(b.policy.id);
      return a.index - b.index;
    });

    const first = matches[0];
    if (!first) return decision(context, resource, action, 'abstain', 'NO_POLICY_MATCHED', null, evaluatedAt);

    return decision(
      context,
      resource,
      action,
      first.rule.effect,
      first.rule.reason,
      first.policy.id,
      evaluatedAt
    );
  }

  return Object.freeze({ evaluate, evaluateSync });
}

export { EFFECTS, normalizePolicy };
