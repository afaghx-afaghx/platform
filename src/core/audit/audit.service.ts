import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditRecord = {
  action: string;
  subjectId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditRecord): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        action: event.action,
        subjectId: event.subjectId,
        tenantId: event.tenantId,
        metadata: event.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
