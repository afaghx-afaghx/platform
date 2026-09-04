import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AfxPublic } from '../authorization/public.decorator';
import { AuthService, SecurityContext } from './auth.service';
import { PasswordService } from './password.service';
import { PrismaService } from '../prisma/prisma.service';
import { MfaService } from './mfa.service';

type ProtectedRequest = Request & { securityContext?: SecurityContext };

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwords: PasswordService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mfa: MfaService,
  ) {}

  @AfxPublic()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const email = body.email.toLowerCase().trim();
    const identity = await this.prisma.identity.findUnique({ where: { email } });
    if (!identity || !identity.passwordHash || identity.status !== 'ACTIVE') {
      await this.audit.record({ action: 'AUTH.LOGIN_FAILED', metadata: { reason: 'INVALID_CREDENTIALS' } });
      throw new UnauthorizedException('Invalid credentials');
    }
    try { await this.passwords.verify(identity.passwordHash, body.password); }
    catch { await this.audit.record({ action: 'AUTH.LOGIN_FAILED', subjectId: identity.id, metadata: { reason: 'INVALID_CREDENTIALS' } }); throw new UnauthorizedException('Invalid credentials'); }

    const membership = await this.prisma.membership.findFirst({ where: { identityId: identity.id, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!membership) { await this.audit.record({ action: 'AUTH.LOGIN_FAILED', subjectId: identity.id, metadata: { reason: 'NO_ACTIVE_MEMBERSHIP' } }); throw new UnauthorizedException('No active membership'); }

    if (await this.mfa.hasActiveFactor(identity.id)) {
      await this.audit.record({ action: 'AUTH.MFA_REQUIRED', subjectId: identity.id, tenantId: membership.tenantId });
      return { mfaRequired: true, subjectId: identity.id, membershipId: membership.id };
    }
    return this.createSession(identity.id, membership.id, membership.tenantId, membership.organizationId);
  }

  @AfxPublic()
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    const hash = this.auth.hashRefreshToken(body.refreshToken);
    const current = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash }, include: { session: { include: { identity: true } } } });
    if (!current || current.expiresAt <= new Date() || current.session.revokedAt || current.session.identity.status !== 'ACTIVE') { await this.audit.record({ action: 'AUTH.REFRESH_FAILED', metadata: { reason: 'INVALID_REFRESH_CREDENTIAL' } }); throw new UnauthorizedException('Invalid refresh token'); }
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
    if (!membership) throw new UnauthorizedException('No active membership');
    const next = randomBytes(48).toString('base64url'); const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.refreshToken.updateMany({ where: { id: current.id, status: 'ACTIVE', usedAt: null }, data: { status: 'USED', usedAt: now } });
      if (updated.count !== 1) throw new UnauthorizedException('Refresh token race detected');
      const nextRow = await tx.refreshToken.create({ data: { sessionId: current.sessionId, tokenHash: this.auth.hashRefreshToken(next), expiresAt: current.expiresAt } });
      await tx.refreshToken.update({ where: { id: current.id }, data: { replacedById: nextRow.id } });
    });
    const accessToken = await this.auth.issueAccessToken({ subjectId: current.session.identityId, sessionId: current.sessionId, tenantId: membership.tenantId, organizationId: membership.organizationId, membershipId: membership.id });
    await this.audit.record({ action: 'AUTH.REFRESH_SUCCEEDED', subjectId: current.session.identityId, tenantId: membership.tenantId });
    return { accessToken, refreshToken: next, tokenType: 'Bearer', expiresIn: Number(process.env.AUTH_ACCESS_TTL_SECONDS ?? 900) };
  }

  @Post('mfa/totp/enroll')
  async enrollTotp(@Req() req: ProtectedRequest, @Body() body: { label?: string }) {
    const ctx = this.requireContext(req); const result = await this.mfa.enrollTotp(ctx.subjectId, body.label);
    await this.audit.record({ action: 'AUTH.MFA_TOTP_ENROLLMENT_STARTED', subjectId: ctx.subjectId, tenantId: ctx.tenantId, metadata: { factorId: result.factorId } });
    return result;
  }

  @Post('mfa/totp/verify')
  async verifyTotp(@Req() req: ProtectedRequest, @Body() body: { factorId: string; code: string }) {
    const ctx = this.requireContext(req); await this.mfa.verifyTotp(ctx.subjectId, body.factorId, body.code);
    await this.audit.record({ action: 'AUTH.MFA_TOTP_ENABLED', subjectId: ctx.subjectId, tenantId: ctx.tenantId, metadata: { factorId: body.factorId } });
    return { enabled: true };
  }

  @Post('mfa/recovery-codes/regenerate')
  async regenerateRecoveryCodes(@Req() req: ProtectedRequest) {
    const ctx = this.requireContext(req); const codes = await this.mfa.generateRecoveryCodes(ctx.subjectId);
    await this.audit.record({ action: 'AUTH.MFA_RECOVERY_CODES_REGENERATED', subjectId: ctx.subjectId, tenantId: ctx.tenantId, metadata: { count: codes.length } });
    return { codes };
  }

  @Post('logout')
  async logout(@Req() req: ProtectedRequest) {
    const ctx = this.requireContext(req); const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.update({ where: { id: ctx.sessionId }, data: { revokedAt: now } }),
      this.prisma.refreshToken.updateMany({ where: { sessionId: ctx.sessionId }, data: { status: 'REVOKED', revokedAt: now } }),
    ]);
    await this.audit.record({ action: 'AUTH.LOGOUT', subjectId: ctx.subjectId, tenantId: ctx.tenantId });
    return { success: true };
  }

  @Get('me')
  async me(@Req() req: ProtectedRequest) {
    const ctx = this.requireContext(req);
    const membership = await this.prisma.membership.findFirst({ where: { id: ctx.membershipId, identityId: ctx.subjectId, tenantId: ctx.tenantId, organizationId: ctx.organizationId, status: 'ACTIVE' }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!membership) throw new UnauthorizedException('Invalid tenant context');
    return { subjectId: ctx.subjectId, sessionId: ctx.sessionId, tenantId: membership.tenantId, organizationId: membership.organizationId, membershipId: membership.id, roles: membership.roles.map((x) => x.role.name), permissions: membership.roles.flatMap((x) => x.role.permissions.map((p) => `${p.permission.action}:${p.permission.resource}`)) };
  }

  private async createSession(identityId: string, membershipId: string, tenantId: string, organizationId: string) {
    const session = await this.prisma.session.create({ data: { identityId, familyId: randomUUID(), expiresAt: new Date(Date.now() + Number(process.env.AUTH_REFRESH_TTL_SECONDS ?? 1209600) * 1000) } });
    const refresh = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({ data: { sessionId: session.id, tokenHash: this.auth.hashRefreshToken(refresh), expiresAt: session.expiresAt } });
    const accessToken = await this.auth.issueAccessToken({ subjectId: identityId, sessionId: session.id, tenantId, organizationId, membershipId });
    await this.audit.record({ action: 'AUTH.LOGIN_SUCCEEDED', subjectId: identityId, tenantId, metadata: { sessionId: session.id } });
    return { accessToken, refreshToken: refresh, tokenType: 'Bearer', expiresIn: Number(process.env.AUTH_ACCESS_TTL_SECONDS ?? 900) };
  }

  private requireContext(req: ProtectedRequest): SecurityContext { if (!req.securityContext) throw new UnauthorizedException('Security context required'); return req.securityContext; }
}
