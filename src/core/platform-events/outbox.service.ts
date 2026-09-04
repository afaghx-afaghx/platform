import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type OutboxEventInput = {
  eventKey: string;
  eventType: string;
  schemaVersion: number;
  aggregateType: string;
  aggregateId: string;
  tenantId?: string;
  payload: Prisma.InputJsonValue;
};

type TransactionClient = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(input: OutboxEventInput, tx?: TransactionClient) {
    const client = tx ?? this.prisma;
    return client.outboxEvent.create({
      data: {
        eventKey: input.eventKey,
        eventType: input.eventType,
        schemaVersion: input.schemaVersion,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        tenantId: input.tenantId,
        payload: input.payload,
      },
    });
  }

  async markPublished(id: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date(), lastError: null },
    });
  }

  async markFailed(id: string, error: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'FAILED', attempts: { increment: 1 }, lastError: error.slice(0, 2000) },
    });
  }

  async claimBatch(limit = 50) {
    return this.prisma.outboxEvent.findMany({
      where: { status: { in: ['PENDING', 'FAILED'] } },
      orderBy: { occurredAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 500),
    });
  }
}
