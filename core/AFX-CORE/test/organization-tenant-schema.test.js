import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.join(process.cwd(), 'migrations', '002_g01_organization_tenant.sql'), 'utf8');

test('organization and tenant migration defines explicit authority boundaries', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS afx_organizations/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS afx_tenants/);
  assert.match(migration, /organization_id TEXT NOT NULL REFERENCES afx_organizations\(id\)/);
  assert.match(migration, /UNIQUE \(organization_id, slug\)/);
  assert.match(migration, /CHECK \(status IN \('active','suspended','deleted'\)\)/);
  assert.match(migration, /FOREIGN KEY \(tenant_id\) REFERENCES afx_tenants\(id\)/);
});

test('organization and tenant migration is idempotent and transaction wrapped', () => {
  assert.match(migration, /^BEGIN;/);
  assert.match(migration, /DO \$\$/);
  assert.match(migration, /IF NOT EXISTS/);
  assert.match(migration, /COMMIT;\s*$/);
});
