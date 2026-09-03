import type { AuthorizationContext, PolicyDecision, PolicyEngine } from './contracts';

export type PolicyRule = (principal: AuthorizationContext, action: string, resource: { type: string; id?: string; tenantId?: string }) => PolicyDecision | undefined;

export class DefaultPolicyEngine implements PolicyEngine {
  constructor(private readonly rules: ReadonlyArray<PolicyRule>) {}
  async authorize(input: { principal: AuthorizationContext; action: string; resource: { type: string; id?: string; tenantId?: string } }): Promise<PolicyDecision> {
    for (const rule of this.rules) {
      const decision = rule(input.principal, input.action, input.resource);
      if (decision) return decision;
    }
    return { allowed: false, reason: 'NO_POLICY_MATCH' };
  }
}

export async function requirePermission(engine: PolicyEngine, principal: AuthorizationContext, action: string, resource: { type: string; id?: string; tenantId?: string }): Promise<void> {
  if (resource.tenantId && resource.tenantId !== principal.tenantId) throw new Error('TENANT_BOUNDARY_VIOLATION');
  const decision = await engine.authorize({ principal, action, resource });
  if (!decision.allowed) throw new Error(`AUTHORIZATION_DENIED:${decision.reason ?? 'POLICY_DENIED'}`);
}
