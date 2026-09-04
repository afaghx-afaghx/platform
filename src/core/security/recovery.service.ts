import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export type RecoveryRecord = { tokenHash: string; expiresAt: number; usedAt?: number };

@Injectable()
export class RecoveryService {
  issue(ttlSeconds = 900): { token: string; record: RecoveryRecord } {
    const token = randomBytes(48).toString('base64url');
    return {
      token,
      record: { tokenHash: this.digest(token), expiresAt: Date.now() + ttlSeconds * 1000 },
    };
  }

  consume(token: string, record: RecoveryRecord, now = Date.now()): void {
    if (!token || record.usedAt || record.expiresAt <= now) throw new UnauthorizedException('Invalid recovery token');
    const actual = Buffer.from(this.digest(token), 'hex');
    const expected = Buffer.from(record.tokenHash, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('Invalid recovery token');
    }
    record.usedAt = now;
  }

  digest(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
