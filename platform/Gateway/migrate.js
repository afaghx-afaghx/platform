import { Pool } from 'pg';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_required');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  process.stdout.write('AFX-CORE PostgreSQL migrations completed.\n');
} finally {
  await pool.end();
}
