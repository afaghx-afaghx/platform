import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { MfaService } from '../security/mfa.service';
import { SecretBoxService } from '../security/secret-box.service';
import { SecurityContext } from './auth.service';

type ProtectedRequest = Request & { securityContext?: SecurityContext };

@Controller('v1/auth/mfa')
export class MfaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mfa: MfaService,
    private readonly secretBox: SecretBoxService,
    private readonly audit: AuditService,
  ) {}

  @Post('setup')
  async setup(@Req() req: ProtectedRequest) {
    const ctx = this.requireContext(req);
    const secret = this.mfa.generateSecret();
    const factor = await this.prisma.mfaFactor.create({
      data: { id: randomUUID(), identityId: ctx.subjectId, type: 'totp', secretCiphertext: this.secretBox.encrypt(secret) },
    });
    await this.audit.record({ action: 'AUTH.MFA_SETUP_STARTED', subjectId: ctx.subjectId, tenantId: ctx.tenantId, metadata: { factorId: factor.id, type: 'totp' } });
    // The secret is returned once for enrollment; it is never persisted in plaintext.
    return { factorId: factor.id, type: 'totp', secret };
  }

  @Post('activate')
  async activate(@Req() req: ProtectedRequest, @Body() body: { factorId: string; code: string }) {
    const ctx = this.requireContext(req);
    const factor = await this.prisma.mfaFactor.findFirst({ where: { id: body.factorId, identityId: ctx.subjectId, status: 'PENDING', type: 'totp' } });
    if (!factor) throw new UnauthorizedException('MFA enrollment rejected');
    const secret = this.secretBox.decrypt(factor.secretCiphertext);
    if (!this.mfa.verifyTotp(secret, body.code)) throw new UnauthorizedException('MFA enrollment rejected');
    await this.prisma.mfaFactor.update({ where: { id: factor.id }, data: { status: 'ACTIVE', lastUsedAt: new Date() } });
    await this.audit.record({ action: 'AUTH.MFA_ACTIVATED', subjectId: ctx.subjectId, tenantId: ctx.tenantId, metadata: { factorId: factor.id } });
    return { activated: true };
  }

  private requireContext(req: ProtectedRequest): SecurityContext {
    if (!req.securityContext) throw new UnauthorizedException('Security context required');
    return req.securityContext;
  }
}
