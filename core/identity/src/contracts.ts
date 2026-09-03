export type UUID = string;

export interface Identity { id: UUID; subject: string; status: 'active' | 'suspended' | 'disabled'; createdAt: string; }
export interface TenantContext { tenantId: UUID; organizationId: UUID; membershipId: UUID; }
export interface AuthorizationContext extends TenantContext { subject: string; roles: string[]; permissions: string[]; sessionId: UUID; }

export interface AccessTokenClaims {
  sub: string; tenant_id: UUID; org_id: UUID; session_id: UUID; roles: string[]; scope: string[];
  iss: string; aud: string | string[]; iat: number; exp: number; jti: UUID;
}
export interface TokenVerifier { verify(token: string): Promise<AccessTokenClaims>; }

export interface PolicyDecision { allowed: boolean; reason?: string; obligations?: Record<string, unknown>[]; }
export interface PolicyEngine {
  authorize(input: {
    principal: AuthorizationContext;
    action: string;
    resource: { type: string; id?: string; tenantId?: UUID };
    attributes?: Record<string, unknown>;
  }): Promise<PolicyDecision>;
}

export interface Session {
  id: UUID; identityId: UUID; tenantId: UUID; refreshTokenFamilyId: UUID;
  status: 'active' | 'revoked' | 'expired' | 'compromised';
  createdAt: string; expiresAt: string; lastRotatedAt?: string;
}
export interface SessionStore {
  get(id: UUID): Promise<Session | null>;
  revoke(id: UUID, reason: string): Promise<void>;
  rotateRefreshToken(sessionId: UUID, presentedTokenHash: string): Promise<{ session: Session; refreshTokenHash: string }>;
}
export interface AuditEvent {
  id: UUID; occurredAt: string; actor: { subject: string; sessionId?: UUID }; tenantId?: UUID;
  action: string; resource?: { type: string; id?: string }; outcome: 'success' | 'denied' | 'failure'; metadata?: Record<string, unknown>;
}
