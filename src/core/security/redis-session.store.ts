import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

/** Redis is ephemeral coordination/session state; PostgreSQL remains the system of record. */
@Injectable()
export class RedisSessionStore implements OnModuleInit, OnModuleDestroy {
  private readonly client: RedisClientType;
  private readonly prefix = process.env.REDIS_KEY_PREFIX ?? 'afx:security:';

  constructor() {
    this.client = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' }) as RedisClientType;
    this.client.on('error', () => undefined);
  }

  async onModuleInit(): Promise<void> {
    if (!this.client.isOpen) await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }

  async putSession(sessionId: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`${this.prefix}session:${sessionId}`, value, { EX: ttlSeconds });
  }

  async getSession(sessionId: string): Promise<string | null> {
    return this.client.get(`${this.prefix}session:${sessionId}`);
  }

  async revokeSession(sessionId: string, ttlSeconds = 86400): Promise<void> {
    await this.client.set(`${this.prefix:}revoked:${sessionId}`, '1', { EX: ttlSeconds });
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    return (await this.client.exists(`${this.prefix}revoked:${sessionId}`)) === 1;
  }

  async incrementRateLimit(key: string, ttlSeconds: number): Promise<number> {
    const redisKey = `${this.prefix}rl:${key}`;
    const count = await this.client.incr(redisKey);
    if (count === 1) await this.client.expire(redisKey, ttlSeconds);
    return count;
  }
}
