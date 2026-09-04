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
    await this.set(`session:${sessionId}`, value, ttlSeconds);
  }

  async getSession(sessionId: string): Promise<string | null> {
    return this.get(`session:${sessionId}`);
  }

  async revokeSession(sessionId: string, ttlSeconds = 86400): Promise<void> {
    await this.set(`revoked:${sessionId}`, '1', ttlSeconds);
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    await this.ready();
    return (await this.client.exists(`${this.prefix}revoked:${sessionId}`)) === 1;
  }

  async putChallenge(key: string, value: string, ttlSeconds = 300): Promise<void> {
    await this.set(`challenge:${key}`, value, ttlSeconds);
  }

  async consumeChallenge(key: string): Promise<string | null> {
    await this.ready();
    const redisKey = `${this.prefix}challenge:${key}`;
    const value = await this.client.get(redisKey);
    if (value !== null) await this.client.del(redisKey);
    return value;
  }

  async incrementRateLimit(key: string, ttlSeconds: number): Promise<number> {
    await this.ready();
    const redisKey = `${this.prefix}rl:${key}`;
    const count = await this.client.incr(redisKey);
    if (count === 1) await this.client.expire(redisKey, ttlSeconds);
    return count;
  }

  private async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.ready();
    await this.client.set(`${this.prefix}${key}`, value, { EX: ttlSeconds });
  }

  private async get(key: string): Promise<string | null> {
    await this.ready();
    return this.client.get(`${this.prefix}${key}`);
  }

  private async ready(): Promise<void> {
    if (this.client.isOpen) return;
    this.connecting ??= this.client.connect().then(() => undefined).finally(() => { this.connecting = undefined; });
    await this.connecting;
  }
}
