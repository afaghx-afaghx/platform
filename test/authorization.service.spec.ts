import { AuthorizationService } from '../src/core/authorization/authorization.service';

describe('AuthorizationService', () => {
  const permissionFindUnique = jest.fn();
  const membershipFindFirst = jest.fn();
  const prisma = { permission: { findUnique: permissionFindUnique }, membership: { findFirst: membershipFindFirst } } as never;
  const service = new AuthorizationService(prisma);

  beforeEach(() => jest.clearAllMocks());

  const base = {
    subjectId: 'subject',
    sessionId: 'session',
    tenantId: 'tenant',
    organizationId: 'org',
    membershipId: 'membership',
    action: 'read',
    resourceType: 'profile',
  };

  it('denies an incomplete security context', async () => {
    const decision = await service.decide({ ...base, tenantId: undefined });
    expect(decision.decision).toBe('deny');
    expect(decision.reasonCode).toBe('INVALID_SECURITY_CONTEXT');
  });

  it('denies unknown permissions', async () => {
    permissionFindUnique.mockResolvedValue(null);
    const decision = await service.decide(base);
    expect(decision.decision).toBe('deny');
    expect(decision.reasonCode).toBe('UNKNOWN_PERMISSION');
  });

  it('denies tenant or membership mismatch', async () => {
    permissionFindUnique.mockResolvedValue({ id: 'permission' });
    membershipFindFirst.mockResolvedValue(null);
    const decision = await service.decide(base);
    expect(decision.decision).toBe('deny');
    expect(decision.reasonCode).toBe('MEMBERSHIP_OR_TENANT_MISMATCH');
  });

  it('allows only when the active membership has the permission', async () => {
    permissionFindUnique.mockResolvedValue({ id: 'permission' });
    membershipFindFirst.mockResolvedValue({ roles: [{ role: { permissions: [{ permissionId: 'permission' }] } }] });
    const decision = await service.decide(base);
    expect(decision.decision).toBe('allow');
    expect(decision.reasonCode).toBe('PERMISSION_GRANTED');
  });
});
