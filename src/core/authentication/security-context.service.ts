import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

@Injectable()
export class SecurityContextService {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService) {}

  async resolve(accessToken: string, requestedTenantId?: string) {
    const tokenContext = await this.auth.verifyAccessToken(accessToken);
    const session = await this.prisma.session.findUnique({ where: { id: tokenContext.sessionId } });
    if (!session || session.identityId !== tokenContext.subjectId || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session is not active');
    }
    const tenantId = requestedTenantId ?? tokenContext.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant context required');
    const membership = await this.prisma.membership.findFirst({ where: { id: tokenContext.membershipId, identityId: tokenContext.subjectId, tenantId, status: 'ACTIVE' } });
    if (!membership) throw new UnauthorizedException('Tenant membership denied');
    return { subjectId: tokenContext.subjectId, sessionId: tokenContext.sessionId, tenantId: membership.tenantId, organizationId: membership.organizationId, membershipId: membership.id };
  }
}
