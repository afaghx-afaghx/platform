import { Injectable, UnauthorizedException } from '@nestjs/common';
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RedisSessionStore } from '../security/redis-session.store';
import { AuthService, SecurityContext } from './auth.service';

const rpName = process.env.WEBAUTHN_RP_NAME ?? 'AFAGHX';
const rpID = process.env.WEBAUTHN_RP_ID ?? 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000';

@Injectable()
export class PasskeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisSessionStore,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  async registrationOptions(ctx: SecurityContext) {
    const identity = await this.prisma.identity.findUnique({ where: { id: ctx.subjectId }, include: { passkeys: true } });
    if (!identity || identity.status !== 'ACTIVE') throw new UnauthorizedException('Identity unavailable');
    const userID = isoUint8Array.fromUTF8String(`afx:${identity.id}`);
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID,
      userName: identity.email,
      attestationType: 'none',
      supportedAlgorithmIDs: [-7, -257],
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      excludeCredentials: identity.passkeys.map((p) => ({ id: p.credentialId, transports: this.transports(p.transports) })),
    });
    const challengeId = randomBytes(24).toString('base64url');
    await this.redis.putChallenge(`registration:${ctx.subjectId}:${challengeId}`, options.challenge, 300);
    await this.audit.record({ action: 'AUTH.PASSKEY_REGISTRATION_OPTIONS', subjectId: ctx.subjectId, tenantId: ctx.tenantId });
    return { challengeId, options };
  }

  async verifyRegistration(ctx: SecurityContext, challengeId: string, response: Parameters<typeof verifyRegistrationResponse>[0]['response']) {
    const challenge = await this.redis.consumeChallenge(`registration:${ctx.subjectId}:${challengeId}`);
    if (!challenge) throw new UnauthorizedException('WebAuthn challenge expired or already used');
    const result = await verifyRegistrationResponse({ response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
    if (!result.verified || !result.registrationInfo) throw new UnauthorizedException('WebAuthn registration rejected');
    const { credential, credentialDeviceType, credentialBackedUp } = result.registrationInfo;
    await this.prisma.passkey.create({
      data: {
        identityId: ctx.subjectId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: credential.transports ?? undefined,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
      },
    });
    await this.audit.record({ action: 'AUTH.PASSKEY_REGISTERED', subjectId: ctx.subjectId, tenantId: ctx.tenantId, metadata: { deviceType: credentialDeviceType, backedUp: credentialBackedUp } });
    return { verified: true };
  }

  async authenticationOptions() {
    const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' });
    const challengeId = randomBytes(24).toString('base64url');
    await this.redis.putChallenge(`authentication:${challengeId}`, options.challenge, 300);
    return { challengeId, options };
  }

  async verifyAuthentication(challengeId: string, response: Parameters<typeof verifyAuthenticationResponse>[0]['response']) {
    const challenge = await this.redis.consumeChallenge(`authentication:${challengeId}`);
    if (!challenge) throw new UnauthorizedException('WebAuthn challenge expired or already used');
    const passkey = await this.prisma.passkey.findUnique({ where: { credentialId: response.id } });
    if (!passkey) throw new UnauthorizedException('Unknown passkey');
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: this.transports(passkey.transports),
      },
    });
    if (!verification.verified) throw new UnauthorizedException('WebAuthn authentication rejected');
    const nextCounter = verification.authenticationInfo.newCounter;
    if (nextCounter < Number(passkey.counter)) throw new UnauthorizedException('WebAuthn counter rollback detected');
    await this.prisma.passkey.update({ where: { id: passkey.id }, data: { counter: BigInt(nextCounter), lastUsedAt: new Date() } });

    const membership = await this.prisma.membership.findFirst({ where: { identityId: passkey.identityId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!membership) throw new UnauthorizedException('No active membership');
    const session = await this.prisma.session.create({ data: { identityId: passkey.identityId, familyId: randomUUID(), expiresAt: new Date(Date.now() + Number(process.env.AUTH_REFRESH_TTL_SECONDS ?? 1209600) * 1000) } });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({ data: { sessionId: session.id, tokenHash: this.auth.hashRefreshToken(refreshToken), expiresAt: session.expiresAt } });
    const accessToken = await this.auth.issueAccessToken({ subjectId: passkey.identityId, sessionId: session.id, tenantId: membership.tenantId, organizationId: membership.organizationId, membershipId: membership.id, authenticationLevel: 'aal2' });
    await this.audit.record({ action: 'AUTH.PASSKEY_LOGIN_SUCCEEDED', subjectId: passkey.identityId, tenantId: membership.tenantId, metadata: { sessionId: session.id } });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: Number(process.env.AUTH_ACCESS_TTL_SECONDS ?? 900), authenticationLevel: 'aal2' };
  }

  private transports(value: unknown): ('ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb')[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const allowed = new Set(['ble', 'cable', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb']);
    const result = value.filter((x): x is string => typeof x === 'string' && allowed.has(x));
    return result as ('ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb')[];
  }
}
