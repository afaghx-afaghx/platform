import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuthService, SecurityContext } from '../authentication/auth.service';
import { AuthorizationService } from './authorization.service';
import { AFX_AUTHORIZATION_KEY } from './authorization.decorator';
import { AFX_PUBLIC_KEY } from './public.decorator';

type AuthorizationMetadata = { action: string; resourceType: string };
export type AfxProtectedRequest = Request & { securityContext?: SecurityContext };

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(AFX_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AfxProtectedRequest>();
    const ctx = req.securityContext ?? (await this.auth.verifyAccessToken(this.bearer(req.headers.authorization)));
    const tenantId = this.header(req, 'x-afx-tenant-id') ?? ctx.tenantId;
    if (!tenantId || !ctx.organizationId || !ctx.membershipId) throw new UnauthorizedException('Valid tenant context required');

    const metadata = this.reflector.getAllAndOverride<AuthorizationMetadata>(AFX_AUTHORIZATION_KEY, [context.getHandler(), context.getClass()]);
    if (!metadata?.action || !metadata.resourceType) throw new ForbiddenException('Authorization policy not declared');

    const resourceId = this.header(req, 'x-afx-resource-id') ?? this.routeResourceId(req);
    const decision = await this.authorization.decide({
      ...ctx,
      tenantId,
      action: metadata.action,
      resourceType: metadata.resourceType,
      resourceId,
    });

    if (decision.decision !== 'allow') {
      await this.audit.record({
        action: 'AUTHZ.DENIED',
        subjectId: ctx.subjectId,
        tenantId,
        metadata: {
          action: metadata.action,
          resourceType: metadata.resourceType,
          resourceId,
          reasonCode: decision.reasonCode,
          policyVersion: decision.policyVersion,
          decisionId: decision.decisionId,
        },
      });
      throw new ForbiddenException(decision.reasonCode);
    }

    req.securityContext = { ...ctx, tenantId };
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

  private routeResourceId(req: Request): string | undefined {
    const params = req.params as Record<string, string | undefined>;
    return params.id ?? params.resourceId;
  }
}
