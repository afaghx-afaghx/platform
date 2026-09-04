import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

/** Redis is ephemeral coordination/session state; PostgreSQL remains the system of record. */
@Injectable()
export class RedisSessionStore implements OnModuleDestroy {
  private readonly client: RedisClientType;
  private readonly prefix = process.env.REDIS_KEY_PREFIX ?? 'afx:security:';
  private connecting?: Promise<void>;

  constructor() {
    this.client = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' }) as RedisClientType;
    this.client.on('error', () => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }

  async putSession(sessionId: string, value: string, ttlSeconds: number): Promise<void> {
    await this.ready();
    await this.client.set(`${this.prefix}session:${sessionId}`, value, { EX: ttlSeconds });
  }

  async getSession(sessionId: string): Promise<string | null> {
    await this.ready();
    return this.client.get(`${this.prefix}session:${sessionId}`);
  }

  async revokeSession(sessionId: string, ttlSeconds = 86400): Promise<void> {
    await this.ready();
    await this.client.set(`${this.prefix}revoked:${sessionId}`, '1', { EX: ttlSeconds });
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    await this.ready();
    return (await this.client.exists(`${this.prefix}revoked:${sessionId}`)) === 1;
  }

  async incrementRateLimit(key: string, ttlSeconds: number): Promise<number> {
    await this.ready();
    const redisKey = `${this.prefix}rl:${key}`;
    const count = await this.client.incr(redisKey);
    if (count === 1) await this.client.expire(redisKey, ttlSeconds);
    return count;
  }

  private async ready(): Promise<void> {
    if (this.client.isOpen) return;
    this.connecting ??= this.client.connect().then(() => undefined).finally(() => { this.connecting = undefined; });
    await this.connecting;
  }
}
