import { Body, Controller, Get, Headers, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly passwords: PasswordService, private readonly prisma: PrismaService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const identity = await this.prisma.identity.findUnique({ where: { email: body.email.toLowerCase().trim() } });
    if (!identity || !identity.passwordHash || identity.status !== 'ACTIVE') throw new UnauthorizedException('Invalid credentials');
    await this.passwords.verify(identity.passwordHash, body.password);
    const membership = await this.prisma.membership.findFirst({ where: { identityId: identity.id, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!membership) throw new UnauthorizedException('No active membership');
    const session = await this.prisma.session.create({ data: { identityId: identity.id, familyId: randomUUID(), expiresAt: new Date(Date.now() + Number(process.env.AUTH_REFRESH_TTL_SECONDS ?? 1209600) * 1000) } });
    const refresh = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({ data: { sessionId: session.id, tokenHash: this.auth.hashRefreshToken(refresh), expiresAt: session.expiresAt } });
    const accessToken = await this.auth.issueAccessToken({ subjectId: identity.id, sessionId: session.id, tenantId: membership.tenantId, organizationId: membership.organizationId, membershipId: membership.id });
    return { accessToken, refreshToken: refresh, tokenType: 'Bearer', expiresIn: Number(process.env.AUTH_ACCESS_TTL_SECONDS ?? 900) };
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    const hash = this.auth.hashRefreshToken(body.refreshToken);
    const current = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash }, include: { session: { include: { identity: true } } } });
    if (!current || current.expiresAt <= new Date() || current.session.revokedAt || current.session.identity.status !== 'ACTIVE') throw new UnauthorizedException('Invalid refresh token');
    if (current.status !== 'ACTIVE' || current.usedAt) {
      await this.prisma.refreshToken.updateMany({ where: { session: { familyId: current.session.familyId } }, data: { status: 'REVOKED', revokedAt: new Date() } });
      await this.prisma.session.update({ where: { id: current.sessionId }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    const membership = await this.prisma.membership.findFirst({ where: { identityId: current.session.identityId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!membership) throw new UnauthorizedException('No active membership');
    const next = randomBytes(48).toString('base64url');
    const nextRow = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.refreshToken.updateMany({ where: { id: current.id, status: 'ACTIVE', usedAt: null }, data: { status: 'USED', usedAt: new Date() } });
      if (updated.count !== 1) throw new UnauthorizedException('Refresh token race detected');
      const created = await tx.refreshToken.create({ data: { sessionId: current.sessionId, tokenHash: this.auth.hashRefreshToken(next), expiresAt: current.expiresAt } });
      await tx.refreshToken.update({ where: { id: current.id }, data: { replacedById: created.id } });
      return created;
    });
    void nextRow;
    const accessToken = await this.auth.issueAccessToken({ subjectId: current.session.identityId, sessionId: current.sessionId, tenantId: membership.tenantId, organizationId: membership.organizationId, membershipId: membership.id });
    return { accessToken, refreshToken: next, tokenType: 'Bearer', expiresIn: Number(process.env.AUTH_ACCESS_TTL_SECONDS ?? 900) };
  }

  @Post('logout')
  async logout(@Req() req: Request) {
    const token = this.bearer(req.headers.authorization);
    const ctx = await this.auth.verifyAccessToken(token);
    await this.prisma.session.update({ where: { id: ctx.sessionId }, data: { revokedAt: new Date() } });
    await this.prisma.refreshToken.updateMany({ where: { sessionId: ctx.sessionId }, data: { status: 'REVOKED', revokedAt: new Date() } });
    return { success: true };
  }

  @Get('me')
  async me(@Req() req: Request, @Headers('x-afx-tenant-id') tenantId?: string) {
    const token = this.bearer(req.headers.authorization);
    const ctx = await this.auth.verifyAccessToken(token);
    const requestedTenant = tenantId ?? ctx.tenantId;
    if (!requestedTenant) throw new UnauthorizedException('Tenant context required');
    const membership = await this.prisma.membership.findFirst({ where: { id: ctx.membershipId, identityId: ctx.subjectId, tenantId: requestedTenant, status: 'ACTIVE' }, include: { organization: true, tenant: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!membership) throw new UnauthorizedException('Invalid tenant context');
    return { subjectId: ctx.subjectId, sessionId: ctx.sessionId, tenantId: membership.tenantId, organizationId: membership.organizationId, membershipId: membership.id, roles: membership.roles.map((x) => x.role.name), permissions: membership.roles.flatMap((x) => x.role.permissions.map((p) => `${p.permission.action}:${p.permission.resource}`)) };
  }

  private bearer(value?: string): string {
    if (!value?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    const token = value.slice(7).trim();
    if (!token) throw new UnauthorizedException('Bearer token required');
    return token;
  }
}
