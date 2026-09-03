import { describe, expect, it } from 'vitest';
import { authenticate, authorize, resolveTenantContext } from '../security';

describe('AFX-CORE security foundation', () => {
  it('rejects missing bearer credentials', async () => {
    await expect(authenticate(undefined, { verify: async () => { throw new Error('should not run'); } })).rejects.toThrow('UNAUTHENTICATED');
  });

  it('requires tenant and organization context in token claims', () => {
    expect(() => resolveTenantContext({
      sub: 'user-1', tenant_id: '', org_id: 'org-1', session_id: 'session-1', roles: [], scope: [],
      iss: 'afx-core', aud: 'afx-platform', iat: 1, exp: 2, jti: 'token-1',
    })).toThrow('INVALID_SECURITY_CONTEXT');
  });

  it('blocks cross-tenant resources before policy evaluation', async () => {
    const policy = { authorize: async () => ({ allowed: true }) };
    await expect(authorize({
      subject: 'user-1', tenantId: 'tenant-a', organizationId: 'org-a', membershipId: 'm-1',
      roles: [], permissions: [], sessionId: 's-1',
    }, 'read', { type: 'document', tenantId: 'tenant-b' }, policy)).rejects.toThrow('TENANT_BOUNDARY_VIOLATION');
  });
});
