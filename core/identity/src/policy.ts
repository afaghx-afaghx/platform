import type { PolicyDecision, PolicyEngine, PermissionRequest, SecurityContext } from './contracts';

export class DefaultPolicyEngine implements PolicyEngine {
  constructor(private readonly policies: ReadonlyArray<(ctx: SecurityContext, req: PermissionRequest) => PolicyDecision | undefined>) {}

  async authorize(ctx: SecurityContext, req: PermissionRequest): Promise<PolicyDecision> {
    if (ctx.tenantId !== req.tenantId) return { allow: false, reason: 'TENANT_BOUNDARY_VIOLATION', policyVersion: 'system' };
    if (req.organizationId && ctx.organizationId !== req.organizationId) return { allow: false, reason: 'ORGANIZATION_BOUNDARY_VIOLATION', policyVersion: 'system' };
    for (const policy of this.policies) {
      const decision = policy(ctx, req);
      if (decision) return decision;
    }
    return { allow: false, reason: 'NO_POLICY_MATCH', policyVersion: 'system' };
  }
}

export async function requirePermission(engine: PolicyEngine, ctx: SecurityContext, request: PermissionRequest): Promise<void> {
  const decision = await engine.authorize(ctx, request);
  if (!decision.allow) throw new Error(`AUTHORIZATION_DENIED:${decision.reason}`);
}
