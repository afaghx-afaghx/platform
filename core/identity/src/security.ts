import { jwtVerify, type KeyLike } from 'jose';
import type { AccessTokenClaims, AuthorizationContext, PolicyDecision, PolicyEngine } from './contracts';

export interface TokenVerifierOptions { issuer: string; audience: string; key: KeyLike; clockToleranceSeconds?: number; }
export interface TokenVerifier { verify(token: string): Promise<AccessTokenClaims>; }

export async function authenticate(authorization: string | undefined, verifier: TokenVerifier): Promise<AccessTokenClaims> {
  if (!authorization?.startsWith('Bearer ')) throw new Error('UNAUTHENTICATED');
  const token = authorization.slice(7).trim();
  if (!token) throw new Error('UNAUTHENTICATED');
  return verifier.verify(token);
}

export function resolveTenantContext(claims: AccessTokenClaims): AuthorizationContext {
  if (!claims.sub || !claims.tenant_id || !claims.org_id || !claims.session_id || !Array.isArray(claims.roles) || !Array.isArray(claims.scope)) throw new Error('INVALID_SECURITY_CONTEXT');
  return { subject: claims.sub, sessionId: claims.session_id, tenantId: claims.tenant_id, organizationId: claims.org_id, membershipId: '', roles: [...claims.roles], permissions: [...claims.scope] };
}

export async function verifyAccessToken(token: string, options: TokenVerifierOptions): Promise<AuthorizationContext> {
  const { payload } = await jwtVerify(token, options.key, {
    issuer: options.issuer, audience: options.audience,
    clockTolerance: options.clockToleranceSeconds ?? 5,
    algorithms: ['RS256', 'ES256'],
  });
  return resolveTenantContext(payload as unknown as AccessTokenClaims);
}

export async function authorize(principal: AuthorizationContext, action: string, resource: { type: string; id?: string; tenantId?: string }, policy: PolicyEngine): Promise<PolicyDecision> {
  if (resource.tenantId && resource.tenantId !== principal.tenantId) throw new Error('TENANT_BOUNDARY_VIOLATION');
  return policy.authorize({ principal, action, resource });
}
