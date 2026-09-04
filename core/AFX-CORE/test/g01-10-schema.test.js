import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const schema = fs.readFileSync(path.join(process.cwd(), 'src', 'persistence-schema.sql'), 'utf8');
const migration = fs.readFileSync(path.join(process.cwd(), 'migrations', '001_g01_10_durable_state.sql'), 'utf8');

for (const [name, sql] of [['schema', schema], ['migration', migration]]) {
  test(`${name} defines durable identity, membership and session state`, () => {
    for (const table of ['afx_identities', 'afx_memberships', 'afx_sessions']) {
      assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    }
    assert.match(sql, /canonical_subject TEXT NOT NULL UNIQUE/);
    assert.match(sql, /REFERENCES afx_identities\(id\) ON DELETE CASCADE/);
    assert.match(sql, /UNIQUE \(identity_id, tenant_id\)/);
    assert.match(sql, /access_token_digest BYTEA NOT NULL UNIQUE/);
    assert.match(sql, /refresh_token_digest BYTEA NOT NULL UNIQUE/);
    assert.match(sql, /refresh_family_id UUID NOT NULL/);
  });
}

test('migration is transaction wrapped', () => {
  assert.match(migration, /^BEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
});
