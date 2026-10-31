import { createRequire } from 'node:module';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { createCanonicalRuntime } from '../../platform/Gateway/runtime.mjs';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('load_test_database_url_required');
if (!process.env.REDIS_URL) throw new Error('load_test_redis_url_required');

const require = createRequire(new URL('../../core/AFX-CORE/package.json', import.meta.url));
const { Pool } = require('pg');
const pool = new Pool({ connectionString: databaseUrl, max: 12, application_name: 'afx-k6-load-test' });
const core = new PersistentAfxCore({ repository: new PostgresAfxCoreRepository(pool) });
await core.migrate();

const runtime = createCanonicalRuntime({ pool, core, allowedOrigins: [] });
const server = runtime.createServer();
const port = Number(process.env.PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('load_test_port_invalid');

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolve);
});

process.stdout.write('AFAGHX k6 target listening on 127.0.0.1:' + port + '\n');

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await new Promise(resolve => server.close(resolve));
  runtime.close();
  await pool.end();
}
process.once('SIGTERM', () => stop().then(() => { process.exitCode = 0; }));
process.once('SIGINT', () => stop().then(() => { process.exitCode = 0; }));
