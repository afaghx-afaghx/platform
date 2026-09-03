import { jwtVerify, type KeyLike } from 'jose';
import type { AccessTokenClaims, AuthorizationContext } from './contracts';

export interface TokenVerifierOptions {
  issuer: string;
  audience: string;
  key: KeyLike;
  clockToleranceSeconds?: number;
}

export async function verifyAccessToken(token: string, options: TokenVerifierOptions): Promise<AuthorizationContext> {
  const { payload } = await jwtVerify(token, options.key, {
    issuer: options.issuer,
    audience: options.audience,
    clockTolerance: options.clockToleranceSeconds ?? 5,
    algorithms: ['RS256', 'ES256'],
  });
  const claims = payload as unknown as Partial<AccessTokenClaims>;
  if (!claims.sub || !claims.session_id || !claims.tenant_id || !claims.jti || !claims.org_id || !Array.isArray(claims.scope) || !Array.isArray(claims.roles)) {
    throw new Error('INVALID_ACCESS_TOKEN_CLAIMS');
  }
  return {
    subject: claims.sub,
    sessionId: claims.session_id,
    tenantId: claims.tenant_id,
    organizationId: claims.org_id,
    membershipId: 'unresolved',
    roles: [...claims.roles],
    permissions: [...claims.scope],
  };
}

export function assertTenantBoundary(ctx: AuthorizationContext, requestedTenantId: string): void {
  if (ctx.tenantId !== requestedTenantId) throw new Error('TENANT_BOUNDARY_VIOLATION');
}
