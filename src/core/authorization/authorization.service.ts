import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityContext } from '../authentication/auth.service';

export type AuthorizationInput = SecurityContext & {
  action: string;
  resourceType: string;
  resourceId?: string;
  authenticationLevel?: string;
  policyContext?: Record<string, unknown>;
};

export type AuthorizationDecision = {
  decision: 'allow' | 'deny';
  reasonCode: string;
  policyVersion: string;
  decisionId: string;
  evaluatedAt: string;
};

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async decide(input: AuthorizationInput): Promise<AuthorizationDecision> {
    const decisionId = randomUUID();
    const evaluatedAt = new Date().toISOString();
    const deny = (reasonCode: string): AuthorizationDecision => ({ decision: 'deny', reasonCode, policyVersion: 'v1', decisionId, evaluatedAt });

    if (!input.subjectId || !input.tenantId || !input.organizationId || !input.membershipId || !input.action || !input.resourceType) {
      return deny('INVALID_SECURITY_CONTEXT');
    }

    const permission = await this.prisma.permission.findUnique({
      where: { action_resource: { action: input.action, resource: input.resourceType } },
    });
    if (!permission) return deny('UNKNOWN_PERMISSION');

    const membership = await this.prisma.membership.findFirst({
      where: {
        id: input.membershipId,
        identityId: input.subjectId,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        status: 'ACTIVE',
        identity: { status: 'ACTIVE' },
      },
      include: { roles: { include: { role: { include: { permissions: true } } } } },
    });
    if (!membership) return deny('MEMBERSHIP_OR_TENANT_MISMATCH');

    const allowed = membership.roles.some((mr) => mr.role.permissions.some((rp) => rp.permissionId === permission.id));
    if (!allowed) return deny('PERMISSION_DENIED');

    return { decision: 'allow', reasonCode: 'PERMISSION_GRANTED', policyVersion: 'v1', decisionId, evaluatedAt };
  }
}
