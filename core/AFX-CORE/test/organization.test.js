import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PersistentAfxCore } from '../src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../src/repository.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('Organization persists in AFX-CORE', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const core = new PersistentAfxCore({ repository: new PostgresAfxCoreRepository(pool) });
  await core.migrate();
  const id = 'org-test-' + Date.now();
  const organization = await core.createOrganization({ id, tenantId:'tenant-a', name:'<MOCK> Test Organization' });
  assert.equal(organization.status, 'active');
  const reloaded = await core.getOrganization(id);
  assert.equal(reloaded.id, id);
  assert.equal(reloaded.tenantId, 'tenant-a');
  assert.equal(reloaded.name, '<MOCK> Test Organization');
  await pool.end();
});