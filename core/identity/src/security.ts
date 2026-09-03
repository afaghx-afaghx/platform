import type { AccessTokenClaims, TokenVerifier, TenantContext, PolicyEngine, AuthorizationContext } from './contracts';

export interface AuthenticationResult {
  claims: AccessTokenClaims;
}

export async function authenticate(
  authorizationHeader: string | undefined,
  verifier: TokenVerifier,
): Promise<AuthenticationResult> {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHENTICATED');
  }
  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) throw new Error('UNAUTHENTICATED');
  return { claims: await verifier.verify(token) };
}

export function resolveTenantContext(claims: AccessTokenClaims): TenantContext {
  if (!claims.sub || !claims.tenant_id || !claims.org_id || !claims.session_id) {
    throw new Error('INVALID_SECURITY_CONTEXT');
  }
  return {
    tenantId: claims.tenant_id,
    organizationId: claims.org_id,
    membershipId: claims.session_id,
  };
}

export async function authorize(
  principal: AuthorizationContext,
  action: string,
  resource: { type: string; id?: string; tenantId?: string },
  policy: PolicyEngine,
): Promise<void> {
  if (resource.tenantId && resource.tenantId !== principal.tenantId) {
    throw new Error('TENANT_BOUNDARY_VIOLATION');
  }
  const decision = await policy.authorize({ principal, action, resource });
  if (!decision.allowed) throw new Error('FORBIDDEN');
}
