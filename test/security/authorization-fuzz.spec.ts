import fc from 'fast-check';
import { AuthorizationService } from '../../src/core/authorization/authorization.service';

describe('AFX-CORE authorization adversarial/property tests', () => {
  const permissionFindUnique = jest.fn();
  const membershipFindFirst = jest.fn();
  const prisma = { permission: { findUnique: permissionFindUnique }, membership: { findFirst: membershipFindFirst } } as never;
  const service = new AuthorizationService(prisma);

  afterEach(() => jest.clearAllMocks());

  it('never allows a tenant mismatch across arbitrary identifiers', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), fc.string(), async (tokenTenant, resourceTenant) => {
        fc.pre(tokenTenant !== resourceTenant);
        permissionFindUnique.mockResolvedValue({ id: 'permission' });
        membershipFindFirst.mockResolvedValue(null);
        const decision = await service.decide({
          subjectId: 'subject', sessionId: 'session', tenantId: tokenTenant,
          organizationId: 'org', membershipId: 'membership', action: 'read', resourceType: 'profile',
        });
        expect(decision.decision).toBe('deny');
        expect(decision.reasonCode).toBe('MEMBERSHIP_OR_TENANT_MISMATCH');
      }),
      { numRuns: 100 },
    );
  });

  it('denies arbitrary unknown actions/resources by default', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 64 }), fc.string({ minLength: 1, maxLength: 64 }), async (action, resource) => {
        permissionFindUnique.mockResolvedValue(null);
        const decision = await service.decide({
          subjectId: 'subject', sessionId: 'session', tenantId: 'tenant',
          organizationId: 'org', membershipId: 'membership', action, resourceType: resource,
        });
        expect(decision.decision).toBe('deny');
      }),
      { numRuns: 100 },
    );
  });
});
