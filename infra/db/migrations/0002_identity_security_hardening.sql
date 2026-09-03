-- AFX-CORE identity/security hardening.
-- Additive migration. 0001 remains immutable.
-- PostgreSQL UUID generation is an explicit infrastructure dependency.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE identities ADD COLUMN IF NOT EXISTS subject text;
CREATE UNIQUE INDEX IF NOT EXISTS identities_tenant_subject_uq ON identities(tenant_id, subject) WHERE subject IS NOT NULL;

ALTER TABLE memberships ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS memberships_identity_tenant_org_active_idx
  ON memberships(identity_id, tenant_id, organization_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS membership_roles (
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (length(trim(role)) > 0),
  PRIMARY KEY (membership_id, role)
);
CREATE TABLE IF NOT EXISTS membership_permissions (
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (length(trim(permission)) > 0),
  PRIMARY KEY (membership_id, permission)
);
CREATE INDEX IF NOT EXISTS membership_roles_role_idx ON membership_roles(role);
CREATE INDEX IF NOT EXISTS membership_permissions_permission_idx ON membership_permissions(permission);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status text;
UPDATE sessions SET status = CASE WHEN revoked_at IS NULL AND expires_at > now() THEN 'active' ELSE 'revoked' END WHERE status IS NULL;
ALTER TABLE sessions ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE sessions ALTER COLUMN status SET NOT NULL;
ALTER TABLE sessions ADD CONSTRAINT sessions_status_ck CHECK (status IN ('active','revoked','expired','compromised')) NOT VALID;
ALTER TABLE sessions VALIDATE CONSTRAINT sessions_status_ck;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_rotated_at timestamptz;

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE refresh_tokens rt SET expires_at = s.expires_at FROM sessions s WHERE s.id = rt.session_id AND rt.expires_at IS NULL;
ALTER TABLE refresh_tokens ALTER COLUMN expires_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS refresh_tokens_hash_active_idx ON refresh_tokens(token_hash) WHERE consumed_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS refresh_tokens_family_state_idx ON refresh_tokens(family_id, consumed_at, revoked_at);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_refresh_family_uq ON sessions(refresh_family_id);
CREATE UNIQUE INDEX IF NOT EXISTS identities_id_tenant_uq ON identities(id, tenant_id);

ALTER TABLE sessions ADD CONSTRAINT sessions_identity_tenant_fk
  FOREIGN KEY (identity_id, tenant_id) REFERENCES identities(id, tenant_id) NOT VALID;
ALTER TABLE sessions VALIDATE CONSTRAINT sessions_identity_tenant_fk;

ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_family_session_fk
  FOREIGN KEY (family_id) REFERENCES sessions(refresh_family_id) NOT VALID;
ALTER TABLE refresh_tokens VALIDATE CONSTRAINT refresh_tokens_family_session_fk;

CREATE INDEX IF NOT EXISTS sessions_active_tenant_identity_idx
  ON sessions(tenant_id, identity_id) WHERE revoked_at IS NULL;

ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS request_id text;
CREATE INDEX IF NOT EXISTS audit_events_subject_time_idx ON audit_events(subject_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_session_time_idx ON audit_events(session_id, occurred_at DESC);
