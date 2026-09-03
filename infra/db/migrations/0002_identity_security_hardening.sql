-- AFX-CORE identity/security hardening.
-- This migration is additive and preserves 0001 as an immutable baseline.

ALTER TABLE identities
  ADD COLUMN IF NOT EXISTS subject text;

CREATE UNIQUE INDEX IF NOT EXISTS identities_subject_tenant_uq
  ON identities(tenant_id, subject);

ALTER TABLE memberships
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS memberships_identity_tenant_org_idx
  ON memberships(identity_id, tenant_id, organization_id)
  WHERE status = 'active';

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS consumed_at timestamptz;

-- 0001 already contains consumed_at on a fresh install; this keeps the migration
-- safe for databases created from older intermediate revisions.
UPDATE refresh_tokens
SET expires_at = COALESCE(expires_at, sessions.expires_at)
FROM sessions
WHERE sessions.id = refresh_tokens.session_id
  AND refresh_tokens.expires_at IS NULL;

ALTER TABLE refresh_tokens
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS refresh_tokens_active_hash_idx
  ON refresh_tokens(token_hash)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS refresh_tokens_family_state_idx
  ON refresh_tokens(family_id, consumed_at, revoked_at);

ALTER TABLE sessions
  ADD CONSTRAINT sessions_tenant_identity_fk
  FOREIGN KEY (identity_id, tenant_id)
  REFERENCES identities(id, tenant_id)
  NOT VALID;

ALTER TABLE sessions
  VALIDATE CONSTRAINT sessions_tenant_identity_fk;

CREATE UNIQUE INDEX IF NOT EXISTS identities_id_tenant_uq
  ON identities(id, tenant_id);

CREATE INDEX IF NOT EXISTS sessions_active_tenant_idx
  ON sessions(tenant_id, identity_id)
  WHERE revoked_at IS NULL;

ALTER TABLE refresh_tokens
  ADD CONSTRAINT refresh_tokens_family_session_fk
  FOREIGN KEY (family_id) REFERENCES sessions(refresh_family_id)
  NOT VALID;

ALTER TABLE refresh_tokens
  VALIDATE CONSTRAINT refresh_tokens_family_session_fk;

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS request_id text;

CREATE INDEX IF NOT EXISTS audit_events_subject_time_idx
  ON audit_events(subject_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_session_time_idx
  ON audit_events(session_id, occurred_at DESC);
