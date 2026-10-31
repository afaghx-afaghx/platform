import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { ensureDomainIdempotencyTable } from '../../domains/runtime/postgres-idempotency.mjs';
import { ensureOutboxSchema } from '../../domains/runtime/outbox.mjs';
import { createCanonicalRuntime } from '../../platform/Gateway/runtime.mjs';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error('load_test_environment_required:' + name);
  return value;
}

const databaseUrl = requiredEnv('DATABASE_URL');
requiredEnv('REDIS_URL');
const email = requiredEnv('K6_LOAD_TEST_EMAIL');
const password = requiredEnv('K6_LOAD_TEST_PASSWORD');
const tenantId = requiredEnv('K6_LOAD_TEST_TENANT');
const role = 'k6_runner_' + String(process.env.GITHUB_RUN_ID || Date.now()).replace(/[^a-zA-Z0-9_]/g, '');

const require = createRequire(new URL('../../core/AFX-CORE/package.json', import.meta.url));
const { Pool } = require('pg');
const pool = new Pool({ connectionString: databaseUrl, max: 12, application_name: 'afx-k6-load-test' });

let runtime;
let server;
let stopping = false;

try {
  const schema = await readFile(new URL('../../domains/runtime/domain-schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  await ensureDomainIdempotencyTable(pool);
  await ensureOutboxSchema(pool);

  const core = new PersistentAfxCore({ repository: new PostgresAfxCoreRepository(pool) });
  await core.migrate();
  const user = await core.createUser({ email, password });
  await core.addMembership({ userId: user.id, tenantId, roles: [role] });
  await core.grantRolePermission(role, 'domain:product:read');
  await core.grantRolePermission(role, 'domain:product:write');

  runtime = createCanonicalRuntime({ pool, core, allowedOrigins: [] });
  server = runtime.createServer();
  const port = Number(process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('load_test_port_invalid');

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  process.stdout.write('AFAGHX k6 canonical Gateway target ready on 127.0.0.1:' + port + '\n');
} catch (error) {
  runtime?.close();
  await pool.end();
  throw error;
}

async function stop() {
  if (stopping) return;
  stopping = true;
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  runtime?.close();
  await pool.end();
}
process.once('SIGTERM', () => stop().then(() => { process.exitCode = 0; }));
process.once('SIGINT', () => stop().then(() => { process.exitCode = 0; }));
