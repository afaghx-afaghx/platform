import { Injectable, UnauthorizedException } from '@nestjs/common';
import { importPKCS8, importSPKI, SignJWT, jwtVerify, KeyLike } from 'jose';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export type SecurityContext = {
  subjectId: string;
  sessionId: string;
  tenantId?: string;
  organizationId?: string;
  membershipId?: string;
};

@Injectable()
export class AuthService {
  private privateKey?: KeyLike;
  private publicKey?: KeyLike;

  constructor(private readonly prisma: PrismaService) {}

  private async keys(): Promise<{ privateKey: KeyLike; publicKey: KeyLike }> {
    if (!this.privateKey || !this.publicKey) {
      const privatePem = process.env.AUTH_JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const publicPem = process.env.AUTH_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
      if (!privatePem || !publicPem || privatePem.includes('REPLACE_WITH')) {
        throw new Error('JWT signing keys are not configured');
      }
      this.privateKey = await importPKCS8(privatePem, 'RS256');
      this.publicKey = await importSPKI(publicPem, 'RS256');
    }
    return { privateKey: this.privateKey, publicKey: this.publicKey };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issueAccessToken(ctx: SecurityContext): Promise<string> {
    const { privateKey } = await this.keys();
    const now = Math.floor(Date.now() / 1000);
    const ttl = Number(process.env.AUTH_ACCESS_TTL_SECONDS ?? 900);
    return new SignJWT({ tid: ctx.tenantId, oid: ctx.organizationId, mid: ctx.membershipId, sid: ctx.sessionId, aal: 'aal1' })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'v1' })
      .setIssuer(process.env.AUTH_ISSUER ?? 'https://auth.afaghx.local')
      .setAudience(process.env.AUTH_AUDIENCE ?? 'afaghx-api')
      .setSubject(ctx.subjectId)
      .setJti(randomBytes(16).toString('hex'))
      .setIssuedAt(now)
      .setExpirationTime(now + ttl)
      .sign(privateKey);
  }

  async verifyAccessToken(token: string): Promise<SecurityContext> {
    const { publicKey } = await this.keys();
    try {
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: process.env.AUTH_ISSUER ?? 'https://auth.afaghx.local',
        audience: process.env.AUTH_AUDIENCE ?? 'afaghx-api',
        algorithms: ['RS256'],
      });
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') throw new Error('Missing security claims');
      return { subjectId: payload.sub, sessionId: payload.sid, tenantId: this.str(payload.tid), organizationId: this.str(payload.oid), membershipId: this.str(payload.mid) };
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private str(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
}
