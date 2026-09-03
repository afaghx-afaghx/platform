import { describe, expect, it } from 'vitest';
import { authenticate, authorize, resolveAuthorizationContext } from '../src/security';
import { DefaultPolicyEngine } from '../src/policy';
import { generateRefreshToken, hashRefreshToken } from '../src/tokens';

const principal = { subject: 'user-1', tenantId: 'tenant-a', organizationId: 'org-a', membershipId: 'm-1', roles: [], permissions: [], sessionId: 's-1' };
const claims = { sub: 'user-1', tenant_id: 'tenant-a', org_id: 'org-a', session_id: 's-1', roles: [], scope: [], iss: 'afx-core', aud: 'afx-platform', iat: 1, exp: 2, jti: 'token-1' };

describe('AFX-CORE security foundation', () => {
  it('rejects missing bearer credentials', async () => {
    await expect(authenticate(undefined, { verify: async () => { throw new Error('should not run'); } })).rejects.toThrow('UNAUTHENTICATED');
  });
  it('requires a real membership instead of manufacturing membership context', async () => {
    await expect(resolveAuthorizationContext(claims, { resolve: async () => null })).rejects.toThrow('MEMBERSHIP_NOT_FOUND');
  });
  it('resolves membership from the tenant-scoped authority', async () => {
    const memberships = { resolve: async (input: { subject: string; tenantId: string; organizationId: string }) => ({ membershipId: `${input.subject}:${input.tenantId}`, roles: ['member'], permissions: ['document:read'] }) };
    await expect(resolveAuthorizationContext(claims, memberships)).resolves.toMatchObject({ membershipId: 'user-1:tenant-a', roles: ['member'] });
  });
  it('blocks cross-tenant resources before policy evaluation', async () => {
    let evaluated = false;
    const policy = new DefaultPolicyEngine([() => { evaluated = true; return { allowed: true }; }]);
    await expect(authorize(principal, 'read', { type: 'document', tenantId: 'tenant-b' }, policy)).rejects.toThrow('TENANT_BOUNDARY_VIOLATION');
    expect(evaluated).toBe(false);
  });
  it('defaults to deny when no policy matches', async () => {
    await expect(new DefaultPolicyEngine([]).authorize({ principal, action: 'read', resource: { type: 'document', tenantId: 'tenant-a' } })).resolves.toMatchObject({ allowed: false });
  });
  it('gives explicit deny precedence over allow', async () => {
    const policy = new DefaultPolicyEngine([() => ({ allowed: true }), () => ({ allowed: false, reason: 'DENY_RULE' })]);
    await expect(policy.authorize({ principal, action: 'read', resource: { type: 'document', tenantId: 'tenant-a' } })).resolves.toMatchObject({ allowed: false, reason: 'DENY_RULE' });
  });
  it('uses opaque high-entropy refresh tokens and stores only a digest', () => {
    const token = generateRefreshToken();
    expect(token).not.toEqual(hashRefreshToken(token));
    expect(hashRefreshToken(token)).toHaveLength(64);
  });
});
