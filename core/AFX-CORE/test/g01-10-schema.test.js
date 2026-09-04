import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.join(process.cwd(), 'migrations', '001_g01_10_durable_state.sql'), 'utf8');

test('G01-10 migration defines durable identity, membership and session state', () => {
  for (const table of ['afx_identities', 'afx_memberships', 'afx_sessions', 'afx_refresh_families', 'afx_refresh_tokens']) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(migration, /canonical_subject TEXT NOT NULL UNIQUE/);
  assert.match(migration, /email TEXT NOT NULL UNIQUE/);
  assert.match(migration, /password_hash TEXT NOT NULL/);
  assert.match(migration, /REFERENCES afx_identities\(id\) ON DELETE CASCADE/);
  assert.match(migration, /UNIQUE \(identity_id, tenant_id\)/);
  assert.match(migration, /access_token_digest TEXT NOT NULL UNIQUE/);
  assert.match(migration, /current_digest TEXT NOT NULL UNIQUE/);
  assert.match(migration, /refresh_family_id TEXT NOT NULL/);
});

test('G01-10 migration is transaction wrapped', () => {
  assert.match(migration, /^BEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
});
