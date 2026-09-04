import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const STEP_SECONDS = 30; const DIGITS = 6;

@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService) {}

  async enrollTotp(identityId: string, label?: string): Promise<{ factorId: string; secret: string; otpauthUri: string }> {
    const secret = this.base32Encode(randomBytes(20)); const factorId = randomUUID();
    await this.prisma.$executeRaw`INSERT INTO "MfaFactor" ("id","identityId","type","status","label","secretCiphertext","createdAt") VALUES (${factorId}::uuid,${identityId}::uuid,'TOTP','PENDING',${label ?? null},${this.encrypt(secret)},NOW())`;
    const issuer = process.env.AUTH_MFA_ISSUER ?? 'AFAGHX'; const account = encodeURIComponent(`${issuer}:${identityId}`);
    return { factorId, secret, otpauthUri: `otpauth://totp/${account}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}` };
  }

  async verifyTotp(identityId: string, factorId: string, code: string): Promise<void> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; secretCiphertext: string }>>`SELECT "id","secretCiphertext" FROM "MfaFactor" WHERE "id"=${factorId}::uuid AND "identityId"=${identityId}::uuid AND "type"='TOTP' AND "status"='PENDING' LIMIT 1`;
    const row = rows[0];
    if (!row || !this.validCode(this.decrypt(row.secretCiphertext), code)) throw new UnauthorizedException('Invalid MFA code');
    const changed = await this.prisma.$executeRaw`UPDATE "MfaFactor" SET "status"='ACTIVE',"verifiedAt"=NOW() WHERE "id"=${factorId}::uuid AND "identityId"=${identityId}::uuid AND "status"='PENDING'`;
    if (changed !== 1) throw new UnauthorizedException('MFA factor is no longer pending');
  }

  async verifyActiveTotp(identityId: string, code: string): Promise<void> {
    const rows = await this.prisma.$queryRaw<Array<{ secretCiphertext: string }>>`SELECT "secretCiphertext" FROM "MfaFactor" WHERE "identityId"=${identityId}::uuid AND "type"='TOTP' AND "status"='ACTIVE' ORDER BY "createdAt" DESC`;
    if (!/^\d{6}$/.test(code) || !rows.some((row) => this.validCode(this.decrypt(row.secretCiphertext), code))) throw new UnauthorizedException('Invalid MFA code');
  }

  async generateRecoveryCodes(identityId: string): Promise<string[]> {
    const codes = Array.from({ length: 10 }, () => `${randomBytes(5).toString('hex')}-${randomBytes(5).toString('hex')}`);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM "RecoveryCode" WHERE "identityId"=${identityId}::uuid`;
      for (const code of codes) await tx.$executeRaw`INSERT INTO "RecoveryCode" ("id","identityId","codeHash","createdAt") VALUES (${randomUUID()}::uuid,${identityId}::uuid,${createHash('sha256').update(code).digest('hex')},NOW())`;
    });
    return codes;
  }

  async consumeRecoveryCode(identityId: string, code: string): Promise<void> {
    const hash = createHash('sha256').update(code).digest('hex');
    const result = await this.prisma.$executeRaw`UPDATE "RecoveryCode" SET "usedAt"=NOW() WHERE "identityId"=${identityId}::uuid AND "codeHash"=${hash} AND "usedAt" IS NULL`;
    if (result !== 1) throw new UnauthorizedException('Invalid recovery code');
  }

  async hasActiveFactor(identityId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`SELECT EXISTS(SELECT 1 FROM "MfaFactor" WHERE "identityId"=${identityId}::uuid AND "status"='ACTIVE') AS "exists"`;
    return Boolean(rows[0]?.exists);
  }

  private validCode(secret: string, code: string): boolean {
    if (!/^\d{6}$/.test(code)) return false;
    const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
    for (const offset of [-1,0,1]) { const candidate = this.totp(secret, counter + offset); if (timingSafeEqual(Buffer.from(candidate), Buffer.from(code))) return true; }
    return false;
  }
  private totp(secret: string, counter: number): string { const key = this.base32Decode(secret); const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(counter)); const digest = createHmac('sha1', key).update(buffer).digest(); const offset = digest[digest.length - 1] & 15; const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000; return String(value).padStart(6,'0'); }
  private encrypt(value: string): string { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key(), iv); const ciphertext = Buffer.concat([cipher.update(value,'utf8'),cipher.final()]); return Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64url'); }
  private decrypt(value: string): string { const raw = Buffer.from(value,'base64url'); const decipher = createDecipheriv('aes-256-gcm',this.key(),raw.subarray(0,12)); decipher.setAuthTag(raw.subarray(12,28)); return Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString('utf8'); }
  private key(): Buffer { const configured = process.env.AUTH_MFA_ENCRYPTION_KEY; if (!configured) throw new Error('AUTH_MFA_ENCRYPTION_KEY is not configured'); return createHash('sha256').update(configured).digest(); }
  private base32Encode(input: Buffer): string { const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits=0,value=0,output=''; for(const byte of input){value=(value<<8)|byte;bits+=8;while(bits>=5){output+=alphabet[(value>>>(bits-5))&31];bits-=5;}} if(bits>0) output+=alphabet[(value<<(5-bits))&31]; return output; }
  private base32Decode(input: string): Buffer { const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits=0,value=0;const output:number[]=[];for(const char of input.replace(/=+$/,'').toUpperCase()){const index=alphabet.indexOf(char);if(index<0)throw new Error('Invalid base32 secret');value=(value<<5)|index;bits+=5;if(bits>=8){output.push((value>>>(bits-8))&255);bits-=8;}}return Buffer.from(output); }
}
