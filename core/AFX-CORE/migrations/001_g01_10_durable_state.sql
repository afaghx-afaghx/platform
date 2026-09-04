BEGIN;

CREATE TABLE IF NOT EXISTS afx_identities (
  id UUID PRIMARY KEY,
  canonical_subject TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','locked','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS afx_memberships (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL REFERENCES afx_identities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (identity_id, tenant_id),
  UNIQUE (identity_id, tenant_id, role)
);

CREATE INDEX IF NOT EXISTS afx_memberships_tenant_idx ON afx_memberships (tenant_id, identity_id);

CREATE TABLE IF NOT EXISTS afx_sessions (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL REFERENCES afx_identities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  refresh_family_id UUID NOT NULL,
  access_token_digest BYTEA NOT NULL UNIQUE,
  refresh_token_digest BYTEA NOT NULL UNIQUE,
  access_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (access_expires_at > created_at),
  CHECK (refresh_expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS afx_sessions_identity_idx ON afx_sessions (identity_id, tenant_id);
CREATE INDEX IF NOT EXISTS afx_sessions_family_idx ON afx_sessions (refresh_family_id);
CREATE INDEX IF NOT EXISTS afx_sessions_active_refresh_idx ON afx_sessions (refresh_family_id, refresh_expires_at) WHERE revoked_at IS NULL;

COMMIT;
