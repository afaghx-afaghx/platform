import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TransactionClient = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  async begin(consumerName: string, messageId: string, tx?: TransactionClient) {
    const client = tx ?? this.prisma;
    return client.inboxMessage.create({
      data: { consumerName, messageId },
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    });
  }

  async markProcessed(id: string) {
    return this.prisma.inboxMessage.update({
      where: { id },
      data: { status: 'PROCESSED', processedAt: new Date(), lastError: null },
    });
  }

  async markFailed(id: string, error: string) {
    return this.prisma.inboxMessage.update({
      where: { id },
      data: { status: 'FAILED', attempts: { increment: 1 }, lastError: error.slice(0, 2000) },
    });
  }
}
