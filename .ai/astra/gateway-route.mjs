import { createModelRouter } from '../../.ai/astra/router.mjs';
import { createToolBoundary } from '../../.ai/astra/boundary.mjs';
import { authorizeCapability } from '../../.ai/astra/permission.mjs';
import { invokeAstra } from '../../.ai/astra/provider.mjs';
import { createEvidence, sha256 } from '../../.ai/astra/evidence.mjs';

const CAPABILITY = 'reasoning.primary';
const CORE_PERMISSION = 'agent.execute';
const TOOL = 'ai.reasoning';

export function createAstraGatewayRoute({ core, audit = async () => {} } = {}) {
  if (!core) throw new Error('core_required');

  return async function astraRoute(req, res, { requestId, sendJson }) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed', requestId });

    const authorization = req.headers.authorization || '';
    const match = /^Bearer\s+(\S+)$/i.exec(authorization);
    if (!match) {
      await audit({ type: 'ai.astra.denied', requestId, reason: 'missing_or_invalid_bearer_token', decision: 'DENY' });
      return sendJson(res, 401, { error: 'missing_or_invalid_bearer_token', requestId });
    }

    let context;
    try {
      context = await core.authenticateAccessToken(match[1]);
    } catch {
      await audit({ type: 'ai.astra.denied', requestId, reason: 'invalid_access_token', decision: 'DENY' });
      return sendJson(res, 401, { error: 'invalid_access_token', requestId });
    }

    const coreAllowed = await core.authorize(context, CORE_PERMISSION, context.tenantId);
    const capabilityDecision = authorizeCapability('analyze');
    if (!coreAllowed || capabilityDecision.decision !== 'ALLOW') {
      const evidence = createEvidence({
        model: 'gpt-6-astra',
        capability: CAPABILITY,
        tool: TOOL,
        authorization_decision: 'DENY',
        action: 'DENY',
        context: JSON.stringify({ requestId, tenantId: context.tenantId }),
        status: 'LOCAL_VALIDATED'
      });
      await audit({ type: 'ai.astra.denied', requestId, tenantId: context.tenantId, userId: context.userId, reason: 'policy_denied', decision: 'DENY', evidence });
      return sendJson(res, 403, { error: 'ai_policy_denied', requestId, evidenceStatus: evidence.status });
    }

    const boundary = createToolBoundary({ policy: { allowedTools: [TOOL] } });
    const toolDecision = boundary.authorize(TOOL);
    if (toolDecision.decision !== 'ALLOW') {
      const evidence = createEvidence({
        model: 'gpt-6-astra',
        capability: CAPABILITY,
        tool: TOOL,
        authorization_decision: 'DENY',
        action: 'DENY',
        context: JSON.stringify({ requestId, tenantId: context.tenantId }),
        status: 'LOCAL_VALIDATED'
      });
      await audit({ type: 'ai.astra.denied', requestId, tenantId: context.tenantId, userId: context.userId, reason: 'tool_denied', decision: 'DENY', evidence });
      return sendJson(res, 403, { error: 'ai_tool_denied', requestId, evidenceStatus: evidence.status });
    }

    const model = createModelRouter({ policy: { [CAPABILITY]: 'gpt-6-astra' } }).resolve(CAPABILITY);
    const provider = invokeAstra({ provider: model.model, action: 'analyze' });
    const evidence = createEvidence({
      run_id: requestId,
      model: model.model,
      capability: CAPABILITY,
      tool: TOOL,
      authorization_decision: 'ALLOW',
      action: 'EXECUTE',
      context: JSON.stringify({ requestId, tenantId: context.tenantId, userId: context.userId }),
      result: provider.output,
      test_results: { gateway: 'PASS', core_auth: 'PASS', core_policy: 'PASS', tool_boundary: 'PASS' },
      artifact_refs: ['AFX-AI-ASTRA-001'],
      status: 'RUNTIME_VALIDATED',
      runtime_validated: true
    });
    const auditEvent = {
      type: 'ai.astra.executed',
      requestId,
      tenantId: context.tenantId,
      userId: context.userId,
      sessionId: context.sessionId,
      model: model.model,
      tool: TOOL,
      decision: 'ALLOW',
      evidenceStatus: evidence.status,
      evidenceHash: sha256(JSON.stringify(evidence))
    };
    await audit(auditEvent);

    return sendJson(res, 200, {
      status: 'RUNTIME_VALIDATED',
      chain: ['GATEWAY', 'AFX-CORE', 'SECURITY_CONTEXT', 'CORE_POLICY', 'TOOL_BOUNDARY', 'ASTRA_ROUTER', 'MOCK_PROVIDER', 'EVIDENCE', 'AUDIT'],
      providerMode: provider.mode,
      tenantId: context.tenantId,
      evidenceStatus: evidence.status,
      evidenceHash: auditEvent.evidenceHash,
      requestId
    });
  };
}
