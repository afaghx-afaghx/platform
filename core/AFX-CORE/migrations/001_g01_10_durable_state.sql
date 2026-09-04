BEGIN;

CREATE TABLE IF NOT EXISTS afx_identities (
  id TEXT PRIMARY KEY,
  canonical_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','locked','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS afx_memberships (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES afx_identities(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (identity_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS afx_role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission)
);

CREATE TABLE IF NOT EXISTS afx_sessions (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES afx_identities(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  refresh_family_id TEXT NOT NULL,
  access_token_digest TEXT NOT NULL UNIQUE,
  access_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS afx_refresh_families (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES afx_identities(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  current_digest TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS afx_refresh_tokens (
  digest TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES afx_refresh_families(id) ON DELETE CASCADE,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS afx_memberships_tenant_idx ON afx_memberships (tenant_id, identity_id);
CREATE INDEX IF NOT EXISTS afx_sessions_identity_idx ON afx_sessions (identity_id, tenant_id);
CREATE INDEX IF NOT EXISTS afx_sessions_family_idx ON afx_sessions (refresh_family_id);
CREATE INDEX IF NOT EXISTS afx_sessions_active_idx ON afx_sessions (refresh_family_id, access_expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS afx_refresh_tokens_family_idx ON afx_refresh_tokens (family_id);

COMMIT;
