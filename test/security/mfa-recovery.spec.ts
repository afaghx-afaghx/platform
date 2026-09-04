import { MfaService } from '../../src/core/security/mfa.service';
import { RecoveryService } from '../../src/core/security/recovery.service';

describe('AFX-CORE MFA and recovery security', () => {
  it('accepts the RFC 6238 SHA-1 test vector at 59 seconds', () => {
    const service = new MfaService();
    expect(service.verifyTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '942870', 59_000, 30, 0)).toBe(true);
    expect(service.verifyTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '000000', 59_000, 30, 0)).toBe(false);
  });

  it('generates high-entropy secrets and rejects malformed codes', () => {
    const service = new MfaService();
    const a = service.generateSecret();
    const b = service.generateSecret();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(service.verifyTotp(a, '12345')).toBe(false);
  });

  it('issues a hashed one-time recovery token and consumes it once', () => {
    const service = new RecoveryService();
    const issued = service.issue(60);
    expect(issued.record.tokenHash).not.toContain(issued.token);
    expect(issued.record.tokenHash).toHaveLength(64);
    service.consume(issued.token, issued.record);
    expect(() => service.consume(issued.token, issued.record)).toThrow('Invalid recovery token');
  });

  it('rejects expired recovery credentials', () => {
    const service = new RecoveryService();
    const issued = service.issue(1);
    expect(() => service.consume(issued.token, issued.record, issued.record.expiresAt)).toThrow('Invalid recovery token');
  });
});
