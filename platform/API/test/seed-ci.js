import { Pool } from 'pg';
import { PersistentAfxCore } from '../../../core/AFX-CORE/src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../../../core/AFX-CORE/src/repository.js';

const required = ['DATABASE_URL', 'CI_TEST_EMAIL', 'CI_TEST_PASSWORD', 'AFAGHX_DEFAULT_TENANT_ID'];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const repository = new PostgresAfxCoreRepository(pool);
  const core = new PersistentAfxCore({ repository });
  await core.migrate();
  try {
    const user = await core.createUser({ email: process.env.CI_TEST_EMAIL, password: process.env.CI_TEST_PASSWORD });
    await core.addMembership({ userId: user.id, tenantId: process.env.AFAGHX_DEFAULT_TENANT_ID, roles: ['ci'] });
  } catch (error) {
    if (error.message !== 'user_exists') throw error;
  }
} finally {
  await pool.end();
}
