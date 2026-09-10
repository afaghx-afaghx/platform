import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { generateMfaSecret, generateRecoveryCodes, verifyTotp } from './mfa.js';

function digest(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function safeEqualHex(a, b) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export class MfaService {
  constructor({ audit = () => {}, clock = () => Date.now() } = {}) {
    this.audit = audit;
    this.clock = clock;
    this.factors = new Map();
    this.recovery = new Map();
    this.usedTotpSteps = new Map();
    this.pending = new Map();
  }

  beginEnrollment(userId) {
    const secret = generateMfaSecret();
    const enrollmentId = randomUUID();
    this.pending.set(enrollmentId, { userId, secret });
    this.audit({ type: 'auth.mfa.enrollment_started', userId, enrollmentId });
    return { enrollmentId, secret };
  }

  confirmEnrollment({ enrollmentId, code, nowMs = this.clock() }) {
    const pending = this.pending.get(enrollmentId);
    if (!pending) throw new Error('invalid_mfa_enrollment');
    if (!verifyTotp({ secret: pending.secret, code, nowMs })) throw new Error('invalid_mfa_code');
    this.factors.set(pending.userId, { secret: pending.secret, version: 1, active: true });
    this.recovery.set(pending.userId, generateRecoveryCodes().map(codeValue => digest(codeValue)));
    this.usedTotpSteps.delete(pending.userId);
    this.pending.delete(enrollmentId);
    this.audit({ type: 'auth.mfa.enrollment_confirmed', userId: pending.userId });
    return { enabled: true };
  }

  verify({ userId, code, nowMs = this.clock() }) {
    const factor = this.factors.get(userId);
    if (!factor?.active) throw new Error('mfa_not_enrolled');
    const step = Math.floor(nowMs / 1000 / 30);
    const accepted = verifyTotp({ secret: factor.secret, code, nowMs });
    if (!accepted || this.usedTotpSteps.get(userId) === step) {
      this.audit({ type: 'auth.mfa.verification_failed', userId });
      throw new Error('invalid_mfa_code');
    }
    this.usedTotpSteps.set(userId, step);
    this.audit({ type: 'auth.mfa.verified', userId });
    return true;
  }

  useRecoveryCode({ userId, code }) {
    const hashes = this.recovery.get(userId) || [];
    const target = digest(code);
    const index = hashes.findIndex(value => safeEqualHex(value, target));
    if (index < 0) {
      this.audit({ type: 'auth.mfa.recovery_failed', userId });
      throw new Error('invalid_recovery_code');
    }
    hashes.splice(index, 1);
    this.audit({ type: 'auth.mfa.recovery_used', userId, remaining: hashes.length });
    return { remaining: hashes.length };
  }

  revoke(userId) {
    const factor = this.factors.get(userId);
    if (!factor) return false;
    factor.active = false;
    factor.version += 1;
    this.usedTotpSteps.delete(userId);
    this.audit({ type: 'auth.mfa.revoked', userId });
    return true;
  }
}
