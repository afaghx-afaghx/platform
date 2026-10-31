import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createPostgresOutboxStore, createOutboxDispatcher } from './outbox.mjs';
import { createRedisClient } from '../../platform/Gateway/redis-client.mjs';
import { createRedisStreamPublisher } from '../../platform/Gateway/redis-rate-limiter.mjs';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`environment_variable_required:${name}`);
  return value;
}

export async function startOutboxWorker({
  databaseUrl = process.env.DATABASE_URL,
  redisUrl = process.env.REDIS_URL,
  workerId = `afx-outbox-${randomUUID()}`,
  batchSize = Number(process.env.OUTBOX_BATCH_SIZE || 50),
  idleMs = Number(process.env.OUTBOX_IDLE_MS || 500),
  maxAttempts = Number(process.env.OUTBOX_MAX_ATTEMPTS || 12),
  streamKey = process.env.REDIS_EVENT_STREAM || 'afx:events:v1',
  onBatch = result => process.stdout.write(`${JSON.stringify({ type: 'outbox.dispatch', workerId, ...result, at: new Date().toISOString() })}\n`)
} = {}) {
  if (!databaseUrl || !redisUrl) throw new Error('outbox_worker_database_and_redis_required');
  const require = createRequire(new URL('../../core/AFX-CORE/package.json', import.meta.url));
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: databaseUrl, max: 4, application_name: workerId });
  const redis = createRedisClient({ url: redisUrl, poolSize: 2 });
  const store = createPostgresOutboxStore(pool);
  const publish = createRedisStreamPublisher({ redis, streamKey });
  const dispatcher = createOutboxDispatcher({ store, publish, workerId, batchSize, maxAttempts });
  const controller = new AbortController();

  const stop = () => controller.abort();
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);

  try {
    await redis.ping();
    while (!controller.signal.aborted) {
      const result = await dispatcher.dispatchOnce();
      if (result.claimed > 0) onBatch(result);
      if (result.claimed === 0 && !controller.signal.aborted) {
        await new Promise(resolve => {
          const done = () => {
            clearTimeout(timer);
            controller.signal.removeEventListener('abort', done);
            resolve();
          };
          const timer = setTimeout(done, idleMs);
          timer.unref?.();
          controller.signal.addEventListener('abort', done, { once: true });
        });
      }
    }
  } finally {
    process.removeListener('SIGTERM', stop);
    process.removeListener('SIGINT', stop);
    redis.close();
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startOutboxWorker().catch(error => {
    process.stderr.write(`${JSON.stringify({ type: 'outbox.worker.failed', code: error?.code || error?.message || 'worker_failed' })}\n`);
    process.exitCode = 1;
  });
}
