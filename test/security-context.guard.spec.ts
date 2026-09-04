import { UnauthorizedException } from '@nestjs/common';
import { SecurityContextGuard } from '../src/core/authentication/security-context.guard';

const baseContext = {
  subjectId: 'identity-1',
  sessionId: 'session-1',
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  membershipId: 'membership-1',
};

describe('SecurityContextGuard', () => {
  const make = (session: unknown = { id: 'session-1' }, membership: unknown = { id: 'membership-1' }) => {
    const auth = { verifyAccessToken: jest.fn().mockResolvedValue(baseContext) };
    const prisma = {
      session: { findFirst: jest.fn().mockResolvedValue(session) },
      membership: { findFirst: jest.fn().mockResolvedValue(membership) },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    const guard = new SecurityContextGuard(auth as never, prisma as never, audit as never, reflector as never);
    return { guard, auth, prisma, audit, reflector };
  };

  const executionContext = (request: Record<string, any>) => ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as never;

  it('rejects a missing bearer token', async () => {
    const { guard } = make();
    await expect(guard.canActivate(executionContext({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an inactive session before membership authorization', async () => {
    const { guard, prisma, audit } = make(null);
    await expect(guard.canActivate(executionContext({ headers: { authorization: 'Bearer token' } }))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'AUTH.SECURITY_CONTEXT_REJECTED' }));
  });

  it('rejects tenant breakout through a client-supplied tenant id', async () => {
    const { guard, prisma } = make();
    const request = { headers: { authorization: 'Bearer token', 'x-afx-tenant-id': 'tenant-attacker' } };
    await expect(guard.canActivate(executionContext(request))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.membership.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-attacker' }) }));
  });

  it('rejects inactive or unrelated membership', async () => {
    const { guard } = make({ id: 'session-1' }, null);
    await expect(guard.canActivate(executionContext({ headers: { authorization: 'Bearer token' } }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('establishes a server-validated security context', async () => {
    const { guard, prisma } = make();
    const request: Record<string, any> = { headers: { authorization: 'Bearer token' } };
    await expect(guard.canActivate(executionContext(request))).resolves.toBe(true);
    expect(request.securityContext).toEqual(baseContext);
    expect(prisma.session.findFirst).toHaveBeenCalled();
    expect(prisma.membership.findFirst).toHaveBeenCalled();
  });
});
