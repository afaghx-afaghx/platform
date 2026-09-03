import { jwtVerify, type KeyLike } from 'jose';
import type { AccessTokenClaims, SecurityContext } from './contracts';

export interface TokenVerifierOptions {
  issuer: string;
  audience: string;
  key: KeyLike;
  clockToleranceSeconds?: number;
}

export async function verifyAccessToken(token: string, options: TokenVerifierOptions): Promise<SecurityContext> {
  const { payload } = await jwtVerify(token, options.key, {
    issuer: options.issuer,
    audience: options.audience,
    clockTolerance: options.clockToleranceSeconds ?? 5,
    algorithms: ['RS256', 'ES256'],
  });
  const claims = payload as unknown as Partial<AccessTokenClaims>;
  if (!claims.sub || !claims.sid || !claims.tenant_id || !claims.jti || !Array.isArray(claims.scope) || !Array.isArray(claims.roles)) {
    throw new Error('INVALID_ACCESS_TOKEN_CLAIMS');
  }
  return {
    subjectId: claims.sub,
    sessionId: claims.sid,
    tenantId: claims.tenant_id,
    ...(claims.org_id ? { organizationId: claims.org_id } : {}),
    scopes: new Set(claims.scope),
    roles: new Set(claims.roles),
  };
}

export function assertTenantBoundary(ctx: SecurityContext, requestedTenantId: string): void {
  if (ctx.tenantId !== requestedTenantId) throw new Error('TENANT_BOUNDARY_VIOLATION');
}
