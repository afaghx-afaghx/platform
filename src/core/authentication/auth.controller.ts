import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AfxPublic } from '../authorization/public.decorator';
import { AuthService, SecurityContext } from './auth.service';
import { PasswordService } from './password.service';
import { PrismaService } from '../prisma/prisma.service';
import { MfaService } from '../security/mfa.service';
import { SecretBoxService } from '../security/secret-box.service';

type ProtectedRequest = Request & { securityContext?: SecurityContext };

type LoginBody = { email: string; password: string; mfaCode?: string };

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwords: PasswordService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mfa: MfaService,
    private readonly secretBox: SecretBoxService,
  ) {}

  @AfxPublic()
  @Post('login')
  async login(@Body() body: LoginBody) {
    const email = body.email.toLowerCase().trim();
    const identity = await this.prisma.identity.findUnique({ where: { email } });
    if (!identity || !identity.passwordHash || identity.status !== 'ACTIVE') {
      await this.audit.record({ action: 'AUTH.LOGIN_FAILED', metadata: { reason: 'INVALID_CREDENTIALS' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    try {
      await this.passwords.verify(identity.passwordHash, body.password);
    } catch {
      await this.audit.record({ action: 'AUTH.LOGIN_FAILED', subjectId: identity.id, metadata: { reason: 'INVALID_CREDENTIALS' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    const activeMfa = await this.prisma.mfaFactor.findFirst({ where: { identityId: identity.id, status: 'ACTIVE', type: 'totp' } });
    if (activeMfa) {
      if (!body.mfaCode) {
        await this.audit.record({ action: 'AUTH.MFA_REQUIRED', subjectId: identity.id });
        throw new UnauthorizedException('MFA required');
      }
      let secret: string;
      try {
        secret = this.secretBox.decrypt(activeMfa.secretCiphertext);
      } catch {
        throw new UnauthorizedException('MFA unavailable');
      }
      if (!this.mfa.verifyTotp(secret, body.mfaCode)) {
        await this.audit.record({ action: 'AUTH.MFA_FAILED', subjectId: identity.id });
        throw new UnauthorizedException('Invalid MFA code');
      }
      await this.prisma.mfaFactor.update({ where: { id: activeMfa.id }, data: { lastUsedAt: new Date() } });
    }

    const membership = await this.prisma.membership.findFirst({ where: { identityId: identity.id, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!membership) {
      await this.audit.record({ action: 'AUTH.LOGIN_FAILED', subjectId: identity.id, metadata: { reason: 'NO_ACTIVE_MEMBERSHIP' } });
      throw new UnauthorizedException('No active membership');
    }

    const session = await this.prisma.session.create({
      data: {
        identityId: identity.id,
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + Number(process.env.AUTH_REFRESH_TTL_SECONDS ?? 1209600) * 1000),
      },
    });
    const refresh = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({ data: { sessionId: session.id, tokenHash: this.auth.hashRefreshToken(refresh), expiresAt: session.expiresAt } });
    const accessToken = await this.auth.issueAccessToken({ subjectId: identity.id, sessionId: session.id, tenantId: membership.tenantId, organizationId: membership.organizationId, membershipId: membership.id, authenticationLevel: activeMfa ? 'aal2' : 'aal1' });
    await this.audit.record({ action: 'AUTH.LOGIN_SUCCEEDED', subjectId: identity.id, tenantId: membership.tenantId, metadata: { sessionId: session.id, authenticationLevel: activeMfa ? 'aal2' : 'aal1' } });
    return { accessToken, refreshToken: refresh, tokenType: 'Bearer', expiresIn: Number(process.env.AUTH_ACCESS_TTL_SECONDS ?? 900), authenticationLevel: activeMfa ? 'aal2' : 'aal1' };
  }

  @AfxPublic()
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    const hash = this.auth.hashRefreshToken(body.refreshToken);
    const current = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash }, include: { session: { include: { identity: true } } } });
    if (!current || current.expiresAt <= new Date() || current.session.revokedAt || current.session.identity.status !== 'ACTIVE') {
      await this.audit.record({ action: 'AUTH.REFRESH_FAILED', metadata: { reason: 'INVALID_REFRESH_CREDENTIAL' } });
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (current.status !== 'ACTIVE' || current.usedAt) {
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.refreshToken.updateMany({ where: { session: { familyId: current.session.familyId } }, data: { status: 'REVOKED', revokedAt: now } }),
        this.prisma.session.update({ where: { id: current.sessionId }, data: { revokedAt: now } }),
      ]);
      await this.audit.record({ action: 'AUTH.REFRESH_REUSE_DETECTED', subjectId: current.session.identityId, metadata: { sessionId: current.sessionId } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const membership = await this.prisma.membership.findFirst({ where: { identityId: current.session.identityId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!membership) {
      await this.audit.record({ action: 'AUTH.REFRESH_FAILED', subjectId: current.session.identityId, metadata: { reason: 'NO_ACTIVE_MEMBERSHIP' } });
      throw new UnauthorizedException('No active membership');
    }
    const activeMfa = await this.prisma.mfaFactor.findFirst({ where: { identityId: current.session.identityId, status: 'ACTIVE', type: 'totp' }, select: { id: true } });

    const next = randomBytes(48).toString('base64url');
    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.refreshToken.updateMany({ where: { id: current.id, status: 'ACTIVE', usedAt: null }, data: { status: 'USED', usedAt: now } });
        if (updated.count !== 1) throw new UnauthorizedException('Refresh token race detected');
        const nextRow = await tx.refreshToken.create({ data: { sessionId: current.sessionId, tokenHash: this.auth.hashRefreshToken(next), expiresAt: current.expiresAt } });
        await tx.refreshToken.update({ where: { id: current.id }, data: { replacedById: nextRow.id } });
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.audit.record({ action: 'AUTH.REFRESH_RACE_DETECTED', subjectId: current.session.identityId, metadata: { sessionId: current.sessionId } });
        throw error;
      }
      throw error;
    }

    const accessToken = await this.auth.issueAccessToken({ subjectId: current.session.identityId, sessionId: current.sessionId, tenantId: membership.tenantId, organizationId: membership.organizationId, membershipId: membership.id, authenticationLevel: activeMfa ? 'aal2' : 'aal1' });
    await this.audit.record({ action: 'AUTH.REFRESH_SUCCEEDED', subjectId: current.session.identityId, tenantId: membership.tenantId, metadata: { sessionId: current.sessionId } });
    return { accessToken, refreshToken: next, tokenType: 'Bearer', expiresIn: Number(process.env.AUTH_ACCESS_TTL_SECONDS ?? 900), authenticationLevel: activeMfa ? 'aal2' : 'aal1' };
  }

  @Post('logout')
  async logout(@Req() req: ProtectedRequest) {
    const ctx = this.requireContext(req);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.update({ where: { id: ctx.sessionId }, data: { revokedAt: now } }),
      this.prisma.refreshToken.updateMany({ where: { sessionId: ctx.sessionId }, data: { status: 'REVOKED', revokedAt: now } }),
    ]);
    await this.audit.record({ action: 'AUTH.LOGOUT', subjectId: ctx.subjectId, tenantId: ctx.tenantId, metadata: { sessionId: ctx.sessionId } });
    return { success: true };
  }

  @Get('me')
  async me(@Req() req: ProtectedRequest) {
    const ctx = this.requireContext(req);
    const membership = await this.prisma.membership.findFirst({ where: { id: ctx.membershipId, identityId: ctx.subjectId, tenantId: ctx.tenantId, organizationId: ctx.organizationId, status: 'ACTIVE' }, include: { organization: true, tenant: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!membership) throw new UnauthorizedException('Invalid tenant context');
    return { subjectId: ctx.subjectId, sessionId: ctx.sessionId, tenantId: membership.tenantId, organizationId: membership.organizationId, membershipId: membership.id, roles: membership.roles.map((x) => x.role.name), permissions: membership.roles.flatMap((x) => x.role.permissions.map((p) => `${p.permission.action}:${p.permission.resource}`)) };
  }

  private requireContext(req: ProtectedRequest): SecurityContext {
    if (!req.securityContext) throw new UnauthorizedException('Security context required');
    return req.securityContext;
  }
}
