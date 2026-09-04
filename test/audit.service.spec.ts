import { AuditService } from '../src/core/audit/audit.service';

describe('AuditService', () => {
  it('recursively redacts credential-bearing keys', async () => {
    const prisma = { auditEvent: { create: jest.fn().mockResolvedValue({}) } };
    const service = new AuditService(prisma as never);
    await service.record({ action: 'TEST', metadata: { token: 'secret', nested: { password: 'pw', safe: 'ok' }, list: [{ authorization: 'Bearer secret' }] } });
    const metadata = prisma.auditEvent.create.mock.calls[0][0].data.metadata;
    expect(metadata).toEqual({ token: '[REDACTED]', nested: { password: '[REDACTED]', safe: 'ok' }, list: [{ authorization: '[REDACTED]' }] });
  });

  it('does not expose audit persistence failures to the request path', async () => {
    const prisma = { auditEvent: { create: jest.fn().mockRejectedValue(new Error('db unavailable')) } };
    const service = new AuditService(prisma as never);
    await expect(service.record({ action: 'TEST' })).resolves.toBeUndefined();
  });
});
