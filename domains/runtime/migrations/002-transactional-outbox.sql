-- AFX-OUTBOX-MIGRATION-002
-- Domain writes and their events must be committed in the same PostgreSQL transaction.
BEGIN;
SELECT pg_advisory_xact_lock(875, 1);

CREATE TABLE IF NOT EXISTS afx_outbox_events (
  event_id TEXT PRIMARY KEY,
  sequence_id BIGSERIAL NOT NULL UNIQUE,
  tenant_id TEXT,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','published','dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  lock_owner TEXT,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

ALTER TABLE afx_outbox_events ADD COLUMN IF NOT EXISTS sequence_id BIGSERIAL;

CREATE UNIQUE INDEX IF NOT EXISTS afx_outbox_sequence_idx
  ON afx_outbox_events (sequence_id);

CREATE INDEX IF NOT EXISTS afx_outbox_pending_idx
  ON afx_outbox_events (next_attempt_at, sequence_id)
  WHERE status IN ('pending','processing');

CREATE INDEX IF NOT EXISTS afx_outbox_tenant_created_idx
  ON afx_outbox_events (tenant_id, created_at);

COMMIT;
