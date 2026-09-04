import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../core/prisma/prisma.service';

export type OutboxInput = {
  eventKey?: string;
  eventType: string;
  schemaVersion: number;
  aggregateType: string;
  aggregateId: string;
  tenantId?: string;
  payload: Prisma.InputJsonValue;
};

export type OutboxPublisher = {
  publish(event: { id: string; eventKey: string; eventType: string; schemaVersion: number; aggregateType: string; aggregateId: string; tenantId: string | null; payload: unknown; occurredAt: Date }): Promise<void>;
};

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(input: OutboxInput, client: Prisma.TransactionClient = this.prisma): Promise<string> {
    const eventKey = input.eventKey ?? randomUUID();
    const row = await client.outboxEvent.create({
      data: { eventKey, eventType: input.eventType, schemaVersion: input.schemaVersion, aggregateType: input.aggregateType, aggregateId: input.aggregateId, tenantId: input.tenantId, payload: input.payload },
      select: { id: true },
    });
    return row.id;
  }

  async withTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  async claimBatch(limit = 50) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('Outbox batch limit must be between 1 and 500');
    return this.prisma.$queryRaw<Array<{ id: string; eventKey: string; eventType: string; schemaVersion: number; aggregateType: string; aggregateId: string; tenantId: string | null; payload: unknown; occurredAt: Date }>>`
      WITH claimed AS (
        SELECT "id" FROM "OutboxEvent" WHERE "status" = 'PENDING'
        ORDER BY "occurredAt" ASC FOR UPDATE SKIP LOCKED LIMIT ${limit}
      )
      UPDATE "OutboxEvent" o SET "attempts" = o."attempts" + 1
      FROM claimed c WHERE o."id" = c."id"
      RETURNING o."id", o."eventKey", o."eventType", o."schemaVersion", o."aggregateType", o."aggregateId", o."tenantId", o."payload", o."occurredAt"
    `;
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date(), lastError: null } });
  }

  async markFailed(id: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown publisher failure';
    await this.prisma.outboxEvent.update({ where: { id }, data: { status: 'FAILED', lastError: message.slice(0, 2000) } });
  }

  async recordInbox(consumerName: string, messageId: string): Promise<boolean> {
    try {
      await this.prisma.inboxMessage.create({ data: { consumerName, messageId } });
      return true;
    } catch (error) {
      if (this.isUniqueViolation(error)) return false;
      throw error;
    }
  }

  async markInboxProcessed(consumerName: string, messageId: string): Promise<void> {
    await this.prisma.inboxMessage.update({ where: { consumerName_messageId: { consumerName, messageId } }, data: { status: 'PROCESSED', processedAt: new Date() } });
  }

  async markInboxFailed(consumerName: string, messageId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown consumer failure';
    await this.prisma.inboxMessage.update({ where: { consumerName_messageId: { consumerName, messageId } }, data: { status: 'FAILED', attempts: { increment: 1 }, lastError: message.slice(0, 2000) } });
  }

  private isUniqueViolation(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');
  }
}
