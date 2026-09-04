import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditRecord = {
  action: string;
  subjectId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
};

const SENSITIVE_KEYS = /token|secret|password|authorization|cookie|private.?key|refresh/i;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditRecord): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          action: event.action,
          subjectId: event.subjectId,
          tenantId: event.tenantId,
          metadata: this.sanitize(event.metadata) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      // Audit persistence must not turn an otherwise valid authentication request into a failure.
      // Operational monitoring should alert on audit-write failures separately.
    }
  }

  private sanitize(value?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!value) return undefined;
    const visit = (input: unknown): unknown => {
      if (Array.isArray(input)) return input.map(visit);
      if (input && typeof input === 'object') {
        return Object.fromEntries(
          Object.entries(input as Record<string, unknown>).map(([key, entry]) => [
            key,
            SENSITIVE_KEYS.test(key) ? '[REDACTED]' : visit(entry),
          ]),
        );
      }
      return input;
    };
    return visit(value) as Record<string, unknown>;
  }
}
