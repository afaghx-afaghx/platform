import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';

const coreRequire = createRequire(new URL('../../core/AFX-CORE/package.json', import.meta.url));
const { Pool } = coreRequire('pg');

export async function runMigrations(databaseUrl = process.env.DATABASE_URL) {
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL_REQUIRED');
  }
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    await repository.migrate();
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await runMigrations();
    console.log('AFAGHX AFX-CORE migrations complete.');
  } catch (error) {
    console.error(`AFAGHX migration failed: ${error.message}`);
    process.exitCode = 1;
  }
}
