import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AfxPublic } from '../authorization/public.decorator';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecoveryService } from '../security/recovery.service';
import { PasswordService } from './password.service';

@Controller('v1/auth/recovery')
export class RecoveryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recovery: RecoveryService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  @AfxPublic()
  @Post('request')
  async request(@Body() body: { email: string }) {
    const email = body.email.toLowerCase().trim();
    const identity = await this.prisma.identity.findUnique({ where: { email }, select: { id: true, status: true } });
    if (identity?.status === 'ACTIVE') {
      const issued = this.recovery.issue(900);
      await this.prisma.recoveryToken.create({ data: { id: randomUUID(), identityId: identity.id, tokenHash: issued.record.tokenHash, expiresAt: new Date(issued.record.expiresAt) } });
      // The raw token is intentionally NOT returned. A notification adapter must deliver it out-of-band.
      await this.audit.record({ action: 'AUTH.RECOVERY_REQUESTED', subjectId: identity.id });
    }
    // Generic response prevents account enumeration.
    return { accepted: true };
  }

  @AfxPublic()
  @Post('consume')
  async consume(@Body() body: { token: string; newPassword: string }) {
    if (body.newPassword.length < 12) throw new UnauthorizedException('Recovery rejected');
    const hash = this.recovery.digest(body.token);
    const row = await this.prisma.recoveryToken.findUnique({ where: { tokenHash: hash }, include: { identity: true } });
    if (!row || row.status !== 'ACTIVE' || row.expiresAt <= new Date() || row.identity.status !== 'ACTIVE') throw new UnauthorizedException('Recovery rejected');

    const now = new Date();
    const passwordHash = await this.passwords.hash(body.newPassword);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.recoveryToken.updateMany({ where: { id: row.id, status: 'ACTIVE', usedAt: null }, data: { status: 'USED', usedAt: now } });
      if (claimed.count !== 1) throw new UnauthorizedException('Recovery rejected');
      await tx.identity.update({ where: { id: row.identityId }, data: { passwordHash } });
      await tx.session.updateMany({ where: { identityId: row.identityId, revokedAt: null }, data: { revokedAt: now } });
      await tx.refreshToken.updateMany({ where: { session: { identityId: row.identityId }, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: now } });
    });
    await this.audit.record({ action: 'AUTH.RECOVERY_COMPLETED', subjectId: row.identityId });
    return { accepted: true };
  }
}
