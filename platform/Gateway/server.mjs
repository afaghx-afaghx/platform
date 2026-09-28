import { createRequire } from 'node:module';
import { createCanonicalRuntime } from './runtime.mjs';

const require = createRequire(new URL('../../core/AFX-CORE/package.json', import.meta.url));
const { Pool } = require('pg');

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const runtime = createCanonicalRuntime({
  pool,
  allowedOrigins: String(process.env.AFX_ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean)
});

await runtime.core.migrate();
const server = runtime.createServer();
server.listen(port, host, () => console.log(JSON.stringify({ status: 'listening', port })));

process.on('SIGTERM', async () => {
  server.close(async () => { await pool.end(); process.exit(0); });
});
