import { jwtVerify, type KeyLike } from 'jose';
import type { AccessTokenClaims, AuthorizationContext, PolicyDecision, PolicyEngine } from './contracts';

export type AccessTokenAlgorithm = 'RS256' | 'ES256';

export interface TokenVerifierOptions {
  issuer: string;
  audience: string;
  key: KeyLike;
  allowedAlgorithms: readonly AccessTokenAlgorithm[];
  clockToleranceSeconds?: number;
}

export interface MembershipResolver {
  resolve(input: { subject: string; tenantId: string; organizationId: string }): Promise<{
    membershipId: string;
    roles: string[];
    permissions: string[];
  } | null>;
}

export interface TokenVerifier {
  verify(token: string): Promise<AccessTokenClaims>;
}

export async function authenticate(
  authorization: string | undefined,
  verifier: TokenVerifier,
): Promise<AccessTokenClaims> {
  if (!authorization?.startsWith('Bearer ')) throw new Error('UNAUTHENTICATED');
  const token = authorization.slice(7).trim();
  if (!token) throw new Error('UNAUTHENTICATED');
  return verifier.verify(token);
}

export async function resolveAuthorizationContext(
  claims: AccessTokenClaims,
  memberships: MembershipResolver,
): Promise<AuthorizationContext> {
  if (!claims.sub || !claims.tenant_id || !claims.org_id || !claims.session_id) {
    throw new Error('INVALID_SECURITY_CONTEXT');
  }

  const membership = await memberships.resolve({
    subject: claims.sub,
    tenantId: claims.tenant_id,
    organizationId: claims.org_id,
  });

  if (!membership) throw new Error('MEMBERSHIP_NOT_FOUND');

  return {
    subject: claims.sub,
    sessionId: claims.session_id,
    tenantId: claims.tenant_id,
    organizationId: claims.org_id,
    membershipId: membership.membershipId,
    roles: [...membership.roles],
    permissions: [...membership.permissions],
  };
}

export async function verifyAccessToken(
  token: string,
  options: TokenVerifierOptions,
): Promise<AccessTokenClaims> {
  if (options.allowedAlgorithms.length === 0) throw new Error('TOKEN_ALGORITHM_POLICY_REQUIRED');

  const { payload } = await jwtVerify(token, options.key, {
    issuer: options.issuer,
    audience: options.audience,
    clockTolerance: options.clockToleranceSeconds ?? 5,
    algorithms: [...options.allowedAlgorithms],
  });

  return payload as unknown as AccessTokenClaims;
}

export async function authorize(
  principal: AuthorizationContext,
  action: string,
  resource: { type: string; id?: string; tenantId?: string },
  policy: PolicyEngine,
): Promise<PolicyDecision> {
  if (resource.tenantId && resource.tenantId !== principal.tenantId) {
    throw new Error('TENANT_BOUNDARY_VIOLATION');
  }
  return policy.authorize({ principal, action, resource });
}
