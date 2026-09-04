import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** RFC 6238 TOTP implementation. The secret must be encrypted by the persistence adapter. */
@Injectable()
export class MfaService {
  generateSecret(bytes = 20): string {
    return this.base32Encode(randomBytes(bytes));
  }

  verifyTotp(secret: string, code: string, now = Date.now(), stepSeconds = 30, window = 1): boolean {
    if (!/^\d{6}$/.test(code)) return false;
    const normalized = this.base32Decode(secret);
    const counter = Math.floor(now / 1000 / stepSeconds);
    for (let offset = -window; offset <= window; offset += 1) {
      const expected = this.hotpsha1(normalized, counter + offset);
      const a = Buffer.from(expected);
      const b = Buffer.from(code);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
    return false;
  }

  assertValidTotp(secret: string, code: string, now?: number): void {
    if (!this.verifyTotp(secret, code, now)) throw new UnauthorizedException('Invalid MFA code');
  }

  private hotpsha1(secret: Buffer, counter: number): string {
    const message = Buffer.alloc(8);
    message.writeBigUInt64BE(BigInt(counter));
    const digest = createHmac('sha1', secret).update(message).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
    return value.toString().padStart(6, '0');
  }

  private base32Encode(input: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let out = '';
    for (const byte of input) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        out += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
    return out;
  }

  private base32Decode(input: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const char of input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')) {
      const index = alphabet.indexOf(char);
      if (index < 0) throw new Error('Invalid MFA secret');
      value = (value << 5) | index;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return Buffer.from(bytes);
  }
}
