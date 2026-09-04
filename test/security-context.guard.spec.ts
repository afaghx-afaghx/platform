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
  const make = (overrides: Record<string, unknown> = {}) => {
    const auth = { verifyAccessToken: jest.fn().mockResolvedValue(baseContext) };
    const securityContext = { validate: jest.fn().mockResolvedValue({ ...baseContext, ...overrides }) };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    return { guard: new SecurityContextGuard(auth as never, securityContext as never, reflector as never), auth, securityContext, reflector };
  };

  const executionContext = (request: Record<string, unknown>) => ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as never;

  it('rejects a missing bearer token', async () => {
    const { guard } = make();
    await expect(guard.canActivate(executionContext({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not accept a client tenant outside the verified security context', async () => {
    const { guard, securityContext } = make();
    const request = { headers: { authorization: 'Bearer token', 'x-afx-tenant-id': 'tenant-attacker' } };
    securityContext.validate.mockRejectedValue(new UnauthorizedException('Tenant mismatch'));
    await expect(guard.canActivate(executionContext(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('requires active server-side context validation', async () => {
    const { guard, securityContext } = make();
    securityContext.validate.mockRejectedValue(new UnauthorizedException('Inactive membership'));
    await expect(guard.canActivate(executionContext({ headers: { authorization: 'Bearer token' } }))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(securityContext.validate).toHaveBeenCalled();
  });
});
