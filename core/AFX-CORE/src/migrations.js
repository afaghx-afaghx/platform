export const AFX_CORE_MIGRATIONS = [
  {
    id: '001_core_identity_auth_baseline',
    apply: async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS afx_users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('active','disabled','pending_recovery')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS afx_memberships (
          user_id TEXT NOT NULL REFERENCES afx_users(id) ON DELETE CASCADE,
          tenant_id TEXT NOT NULL,
          roles JSONB NOT NULL DEFAULT '[]'::jsonb,
          status TEXT NOT NULL CHECK (status IN ('active','disabled')),
          PRIMARY KEY (user_id, tenant_id)
        );
        CREATE TABLE IF NOT EXISTS afx_role_permissions (
          role TEXT NOT NULL,
          permission TEXT NOT NULL,
          PRIMARY KEY (role, permission)
        );
        CREATE TABLE IF NOT EXISTS afx_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES afx_users(id) ON DELETE CASCADE,
          tenant_id TEXT NOT NULL,
          family_id TEXT NOT NULL,
          access_digest TEXT NOT NULL UNIQUE,
          access_expires_at TIMESTAMPTZ NOT NULL,
          revoked BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS afx_refresh_families (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES afx_users(id) ON DELETE CASCADE,
          tenant_id TEXT NOT NULL,
          current_digest TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          revoked BOOLEAN NOT NULL DEFAULT false,
          version BIGINT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS afx_refresh_tokens (
          digest TEXT PRIMARY KEY,
          family_id TEXT NOT NULL REFERENCES afx_refresh_families(id) ON DELETE CASCADE,
          used BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
    },
  },
  {
    id: '002_account_lifecycle_recovery',
    apply: async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS afx_recovery_tokens (
          digest TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES afx_users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS afx_sessions_family_idx ON afx_sessions(family_id);
        CREATE INDEX IF NOT EXISTS afx_sessions_user_idx ON afx_sessions(user_id);
        CREATE INDEX IF NOT EXISTS afx_memberships_tenant_idx ON afx_memberships(tenant_id);
        CREATE INDEX IF NOT EXISTS afx_recovery_user_idx ON afx_recovery_tokens(user_id);
        CREATE INDEX IF NOT EXISTS afx_recovery_expiry_idx ON afx_recovery_tokens(expires_at);
      `);
    },
  },
];

export async function migrateAfxCore(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS afx_schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['afx-core-schema-migrations']);

    const { rows } = await client.query('SELECT id FROM afx_schema_migrations');
    const applied = new Set(rows.map((row) => row.id));
    for (const migration of AFX_CORE_MIGRATIONS) {
      if (applied.has(migration.id)) continue;
      await migration.apply(client);
      await client.query('INSERT INTO afx_schema_migrations(id) VALUES($1)', [migration.id]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
