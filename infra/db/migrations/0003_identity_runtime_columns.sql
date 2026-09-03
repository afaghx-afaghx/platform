-- Runtime columns required by the AFX-CORE PostgreSQL adapter.

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}';

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS last_rotated_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS sessions_refresh_family_uq
  ON sessions(refresh_family_id);

CREATE INDEX IF NOT EXISTS identities_subject_idx
  ON identities(subject);
