import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
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
    if (!metadata?.action || !metadata.resourceType) throw new UnauthorizedException('Authorization policy not declared');

    const decision = await this.authorization.decide({ ...ctx, tenantId, action: metadata.action, resourceType: metadata.resourceType });
    if (decision.decision !== 'allow') throw new UnauthorizedException(decision.reasonCode);
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
}
