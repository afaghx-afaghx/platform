import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService, SecurityContext } from '../authentication/auth.service';
import { AuthorizationService } from './authorization.service';

export type AfxProtectedRequest = Request & { securityContext?: SecurityContext };

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly authorization: AuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AfxProtectedRequest>();
    const token = this.bearer(req.headers.authorization);
    const ctx = await this.auth.verifyAccessToken(token);
    const tenantId = this.header(req, 'x-afx-tenant-id') ?? ctx.tenantId;
    if (!tenantId || !ctx.organizationId || !ctx.membershipId) throw new UnauthorizedException('Valid tenant context required');

    // Route handlers may provide these metadata values later; the guard intentionally
    // fails closed until an explicit permission is declared on the route.
    const action = Reflect.getMetadata('afx:action', context.getHandler()) as string | undefined;
    const resourceType = Reflect.getMetadata('afx:resource', context.getHandler()) as string | undefined;
    if (!action || !resourceType) throw new UnauthorizedException('Authorization policy not declared');

    const decision = await this.authorization.decide({ ...ctx, tenantId, action, resourceType });
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
