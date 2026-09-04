import { Injectable, UnauthorizedException } from '@nestjs/common';
import { importPKCS8, importSPKI, SignJWT, jwtVerify, KeyLike } from 'jose';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { KmsKeyManager } from '../security/kms-key-manager';

export type AuthenticationLevel = 'aal1' | 'aal2';
export type SecurityContext = {
  subjectId: string;
  sessionId: string;
  tenantId?: string;
  organizationId?: string;
  membershipId?: string;
  authenticationLevel?: AuthenticationLevel;
};

const b64url = (value: Uint8Array | string): string => Buffer.from(value).toString('base64url');

@Injectable()
export class AuthService {
  private privateKey?: KeyLike;
  private publicKey?: KeyLike;

  constructor(private readonly prisma: PrismaService, private readonly kms: KmsKeyManager) {}

  private async envKeys(): Promise<{ privateKey: KeyLike; publicKey: KeyLike }> {
    if (!this.privateKey || !this.publicKey) {
      const privatePem = process.env.AUTH_JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const publicPem = process.env.AUTH_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
      if (!privatePem || !publicPem || privatePem.includes('REPLACE_WITH')) throw new Error('JWT signing keys are not configured');
      this.privateKey = await importPKCS8(privatePem, 'RS256');
      this.publicKey = await importSPKI(publicPem, 'RS256');
    }
    return { privateKey: this.privateKey, publicKey: this.publicKey };
  }

  hashRefreshToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }

  async issueAccessToken(ctx: SecurityContext): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = Number(process.env.AUTH_ACCESS_TTL_SECONDS ?? 900);
    const aal = ctx.authenticationLevel ?? 'aal1';
    const payload = { tid: ctx.tenantId, oid: ctx.organizationId, mid: ctx.membershipId, sid: ctx.sessionId, aal };
    if (process.env.AUTH_KMS_KEYS_JSON) {
      const kid = await this.kms.activeKid();
      const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid }));
      const body = b64url(JSON.stringify({ ...payload, iss: process.env.AUTH_ISSUER ?? 'https://auth.afaghx.local', aud: process.env.AUTH_AUDIENCE ?? 'afaghx-api', sub: ctx.subjectId, jti: randomBytes(16).toString('hex'), iat: now, exp: now + ttl }));
      const input = Buffer.from(`${header}.${body}`);
      const signed = await this.kms.sign(input);
      return `${header}.${body}.${b64url(signed.signature)}`;
    }
    const { privateKey } = await this.envKeys();
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: process.env.AUTH_ACTIVE_KID ?? 'v1' })
      .setIssuer(process.env.AUTH_ISSUER ?? 'https://auth.afaghx.local')
      .setAudience(process.env.AUTH_AUDIENCE ?? 'afaghx-api')
      .setSubject(ctx.subjectId)
      .setJti(randomBytes(16).toString('hex'))
      .setIssuedAt(now)
      .setExpirationTime(now + ttl)
      .sign(privateKey);
  }

  async verifyAccessToken(token: string): Promise<SecurityContext> {
    try {
      let payload;
      if (process.env.AUTH_KMS_KEYS_JSON) {
        const protectedHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8')) as { kid?: string; alg?: string };
        if (protectedHeader.alg !== 'RS256' || !protectedHeader.kid) throw new Error('Invalid token header');
        const publicKey = await this.kms.publicKey(protectedHeader.kid);
        payload = (await jwtVerify(token, publicKey, { issuer: process.env.AUTH_ISSUER ?? 'https://auth.afaghx.local', audience: process.env.AUTH_AUDIENCE ?? 'afaghx-api', algorithms: ['RS256'] })).payload;
      } else {
        const { publicKey } = await this.envKeys();
        payload = (await jwtVerify(token, publicKey, { issuer: process.env.AUTH_ISSUER ?? 'https://auth.afaghx.local', audience: process.env.AUTH_AUDIENCE ?? 'afaghx-api', algorithms: ['RS256'] })).payload;
      }
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') throw new Error('Missing security claims');
      if (payload.aal !== 'aal1' && payload.aal !== 'aal2') throw new Error('Invalid authentication assurance');
      return { subjectId: payload.sub, sessionId: payload.sid, tenantId: this.str(payload.tid), organizationId: this.str(payload.oid), membershipId: this.str(payload.mid), authenticationLevel: payload.aal as AuthenticationLevel };
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private str(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
}
