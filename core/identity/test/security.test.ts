import { describe, expect, it } from 'vitest';
import { authenticate, authorize, resolveTenantContext } from '../src/security';
import { DefaultPolicyEngine } from '../src/policy';
import { generateRefreshToken, hashRefreshToken } from '../src/tokens';

const principal = { subject: 'user-1', tenantId: 'tenant-a', organizationId: 'org-a', membershipId: 'm-1', roles: [], permissions: [], sessionId: 's-1' };

describe('AFX-CORE security foundation', () => {
  it('rejects missing bearer credentials', async () => {
    await expect(authenticate(undefined, { verify: async () => { throw new Error('should not run'); } })).rejects.toThrow('UNAUTHENTICATED');
  });
  it('rejects incomplete tenant context', () => {
    expect(() => resolveTenantContext({ sub: 'user-1', tenant_id: '', org_id: 'org-1', session_id: 'session-1', roles: [], scope: [], iss: 'afx-core', aud: 'afx-platform', iat: 1, exp: 2, jti: 'token-1' })).toThrow('INVALID_SECURITY_CONTEXT');
  });
  it('blocks cross-tenant resources before policy evaluation', async () => {
    const policy = new DefaultPolicyEngine([() => ({ allowed: true })]);
    await expect(authorize(principal, 'read', { type: 'document', tenantId: 'tenant-b' }, policy)).rejects.toThrow('TENANT_BOUNDARY_VIOLATION');
  });
  it('defaults to deny when no policy matches', async () => {
    const policy = new DefaultPolicyEngine([]);
    await expect(policy.authorize({ principal, action: 'read', resource: { type: 'document', tenantId: 'tenant-a' } })).resolves.toMatchObject({ allowed: false });
  });
  it('uses opaque high-entropy refresh tokens and stores only a digest', () => {
    const token = generateRefreshToken();
    expect(token).not.toEqual(hashRefreshToken(token));
    expect(hashRefreshToken(token)).toHaveLength(64);
  });
});
