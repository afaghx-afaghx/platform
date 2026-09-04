import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AFX_PUBLIC_KEY } from '../authorization/public.decorator';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService, SecurityContext } from './auth.service';

type ProtectedRequest = Request & { securityContext?: SecurityContext };

@Injectable()
export class SecurityContextGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(AFX_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<ProtectedRequest>();
    const decoded = await this.auth.verifyAccessToken(this.bearer(req.headers.authorization));
    const tenantId = this.header(req, 'x-afx-tenant-id') ?? decoded.tenantId;

    if (!tenantId || !decoded.organizationId || !decoded.membershipId) {
      await this.audit.record({ action: 'AUTH.SECURITY_CONTEXT_REJECTED', subjectId: decoded.subjectId, metadata: { reason: 'MISSING_TENANT_CONTEXT' } });
      throw new UnauthorizedException('Valid tenant context required');
    }

    const session = await this.prisma.session.findFirst({
      where: { id: decoded.sessionId, identityId: decoded.subjectId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, authenticationLevel: true },
    });
    if (!session) {
      await this.audit.record({ action: 'AUTH.SECURITY_CONTEXT_REJECTED', subjectId: decoded.subjectId, tenantId, metadata: { reason: 'INACTIVE_SESSION' } });
      throw new UnauthorizedException('Session is inactive');
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        id: decoded.membershipId,
        identityId: decoded.subjectId,
        tenantId,
        organizationId: decoded.organizationId,
        status: 'ACTIVE',
        identity: { status: 'ACTIVE' },
      },
      select: { id: true },
    });
    if (!membership) {
      await this.audit.record({ action: 'AUTH.SECURITY_CONTEXT_REJECTED', subjectId: decoded.subjectId, tenantId, metadata: { reason: 'INVALID_TENANT_MEMBERSHIP' } });
      throw new UnauthorizedException('Invalid tenant membership');
    }

    const authenticationLevel = session.authenticationLevel === 'aal2' ? 'aal2' : 'aal1';
    req.securityContext = { ...decoded, tenantId, authenticationLevel };
    return true;
  }

  private bearer(value?: string): string {
    if (!value?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    const token = value.slice(7).trim();
    if (!token) throw new UnauthorizedException('Bearer token required');
    return token;
  }

  private header(req: Request, name: string): string | undefined {
    const value = req.headers[name];
    return typeof value === 'string' ? value.trim() || undefined : undefined;
  }
}
