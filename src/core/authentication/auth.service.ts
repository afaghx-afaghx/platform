import { Injectable, UnauthorizedException } from '@nestjs/common';
import { importPKCS8, importSPKI, SignJWT, jwtVerify, JWTVerifyResult } from 'jose';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export type SecurityContext = {
  subjectId: string;
  sessionId: string;
  tenantId?: string;
  organizationId?: string;
  membershipId?: string;
  authenticationLevel?: 'aal1' | 'aal2';
};

type SigningKey = { kid: string; privateKey: Awaited<ReturnType<typeof importPKCS8>>; publicKey: Awaited<ReturnType<typeof importSPKI>> };
type RawKey = { kid: string; privateKey: string; publicKey: string };

@Injectable()
export class AuthService {
  private keySet?: SigningKey[];

  constructor(private readonly prisma: PrismaService) {}

  private async keys(): Promise<SigningKey[]> {
    if (this.keySet) return this.keySet;

    const raw = process.env.AUTH_JWT_KEYS_JSON;
    if (raw) {
      let entries: RawKey[];
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) throw new Error('AUTH_JWT_KEYS_JSON must be an array');
        entries = parsed as RawKey[];
      } catch {
        throw new Error('AUTH_JWT_KEYS_JSON is invalid');
      }
      if (!entries.length) throw new Error('AUTH_JWT_KEYS_JSON must contain at least one key');
      this.keySet = await Promise.all(entries.map(async (entry) => {
        if (!entry?.kid || !entry.privateKey || !entry.publicKey) throw new Error('Every JWT key requires kid, privateKey and publicKey');
        return { kid: entry.kid, privateKey: await importPKCS8(entry.privateKey.replace(/\\n/g, '\n'), 'RS256'), publicKey: await importSPKI(entry.publicKey.replace(/\\n/g, '\n'), 'RS256') };
      }));
      return this.keySet;
    }

    const privatePem = process.env.AUTH_JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const publicPem = process.env.AUTH_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
    const kid = process.env.AUTH_JWT_KID ?? 'v1';
    if (!privatePem || !publicPem || privatePem.includes('REPLACE_WITH') || publicPem.includes('REPLACE_WITH')) throw new Error('JWT signing keys are not configured');
    this.keySet = [{ kid, privateKey: await importPKCS8(privatePem, 'RS256'), publicKey: await importSPKI(publicPem, 'RS256') }];
    return this.keySet;
  }

  private async activeKey(): Promise<SigningKey> {
    const keys = await this.keys();
    const activeKid = process.env.AUTH_JWT_ACTIVE_KID ?? process.env.AUTH_JWT_KID ?? keys[0].kid;
    const key = keys.find((entry) => entry.kid === activeKid);
    if (!key) throw new Error('AUTH_JWT_ACTIVE_KID does not match a configured signing key');
    return key;
  }

  private async verify<T extends Record<string, unknown> = Record<string, unknown>>(token: string, audience: string): Promise<JWTVerifyResult<T>> {
    const keys = await this.keys();
    const issuer = process.env.AUTH_ISSUER ?? 'https://auth.afaghx.local';
    let lastError: unknown;
    for (const key of keys) {
      try {
        return await jwtVerify<T>(token, key.publicKey, { issuer, audience, algorithms: ['RS256'], requiredClaims: ['sub', 'jti', 'iat', 'exp'] });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error('JWT verification failed');
  }

  hashRefreshToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }

  async issueAccessToken(ctx: SecurityContext): Promise<string> {
    const key = await this.activeKey();
    const now = Math.floor(Date.now() / 1000);
    const ttl = Number(process.env.AUTH_ACCESS_TTL_SECONDS ?? 900);
    if (!Number.isInteger(ttl) || ttl < 60 || ttl > 3600) throw new Error('AUTH_ACCESS_TTL_SECONDS must be between 60 and 3600');
    return new SignJWT({ tid: ctx.tenantId, oid: ctx.organizationId, mid: ctx.membershipId, sid: ctx.sessionId, aal: ctx.authenticationLevel ?? 'aal1' })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: key.kid }).setIssuer(process.env.AUTH_ISSUER ?? 'https://auth.afaghx.local').setAudience(process.env.AUTH_AUDIENCE ?? 'afaghx-api').setSubject(ctx.subjectId).setJti(randomBytes(16).toString('hex')).setIssuedAt(now).setExpirationTime(now + ttl).sign(key.privateKey);
  }

  async issueMfaChallenge(ctx: Omit<SecurityContext, 'sessionId' | 'authenticationLevel'>): Promise<string> {
    const key = await this.activeKey(); const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ purpose: 'mfa', tid: ctx.tenantId, oid: ctx.organizationId, mid: ctx.membershipId })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: key.kid }).setIssuer(process.env.AUTH_ISSUER ?? 'https://auth.afaghx.local').setAudience('afaghx-mfa').setSubject(ctx.subjectId).setJti(randomBytes(16).toString('hex')).setIssuedAt(now).setExpirationTime(now + 300).sign(key.privateKey);
  }

  async verifyMfaChallenge(token: string): Promise<Omit<SecurityContext, 'sessionId' | 'authenticationLevel'>> {
    try {
      const { payload } = await this.verify(token, 'afaghx-mfa');
      if (payload.purpose !== 'mfa' || typeof payload.sub !== 'string' || typeof payload.mid !== 'string' || typeof payload.oid !== 'string' || typeof payload.tid !== 'string') throw new Error('Invalid MFA challenge');
      return { subjectId: payload.sub, membershipId: payload.mid, organizationId: payload.oid, tenantId: payload.tid };
    } catch { throw new UnauthorizedException('Invalid MFA challenge'); }
  }

  async verifyAccessToken(token: string): Promise<SecurityContext> {
    try {
      const { payload } = await this.verify(token, process.env.AUTH_AUDIENCE ?? 'afaghx-api');
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') throw new Error('Missing security claims');
      if (payload.aal !== 'aal1' && payload.aal !== 'aal2') throw new Error('Invalid authentication assurance');
      return { subjectId: payload.sub, sessionId: payload.sid, tenantId: this.str(payload.tid), organizationId: this.str(payload.oid), membershipId: this.str(payload.mid), authenticationLevel: payload.aal };
    } catch { throw new UnauthorizedException('Invalid access token'); }
  }

  private str(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
}
