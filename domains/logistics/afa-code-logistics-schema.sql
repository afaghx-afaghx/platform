-- AFA CODE logistics-domain schema proposal.
-- Requires migration review, PostgreSQL execution, and rollback testing before production.
-- Logistics owns shipments, logistic units, and event history. Cross-domain references have no FK.

CREATE TABLE IF NOT EXISTS logistics_shipment_identity (
  internal_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  shipment_record_id TEXT NOT NULL UNIQUE REFERENCES domain_logistics(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT logistics_shipment_public_id_format
    CHECK (public_id ~ '^AFA-SHP-[A-Za-z0-9_-]{16,64}$')
);

CREATE TABLE IF NOT EXISTS logistic_units (
  internal_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  shipment_internal_id TEXT NOT NULL REFERENCES logistics_shipment_identity(internal_id) ON DELETE RESTRICT,
  parent_logistic_unit_public_id TEXT,
  sscc_value CHAR(18),
  lifecycle_state TEXT NOT NULL DEFAULT 'created'
    CHECK (lifecycle_state IN ('created', 'packed', 'shipped', 'received', 'exception', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT logistic_unit_public_id_format
    CHECK (public_id ~ '^AFA-LU-[A-Za-z0-9_-]{16,64}$'),
  CONSTRAINT logistic_unit_sscc_format
    CHECK (sscc_value IS NULL OR sscc_value ~ '^[0-9]{18}$'),
  CONSTRAINT logistic_unit_parent_not_self
    CHECK (parent_logistic_unit_public_id IS NULL OR parent_logistic_unit_public_id <> public_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS logistic_units_sscc_unique
  ON logistic_units (sscc_value) WHERE sscc_value IS NOT NULL;

CREATE TABLE IF NOT EXISTS traceability_events (
  internal_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'commissioning', 'packing', 'shipping', 'handover', 'arrival',
    'customs_release', 'delivery', 'exception', 'correction', 'void'
  )),
  subject_public_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location_public_id TEXT,
  actor_organization_public_id TEXT,
  correlation_id TEXT,
  idempotency_key TEXT,
  source_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  corrects_event_public_id TEXT,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT traceability_event_public_id_format
    CHECK (public_id ~ '^AFA-EVT-[A-Za-z0-9_-]{16,64}$'),
  CONSTRAINT traceability_correction_target_required
    CHECK (event_type NOT IN ('correction', 'void') OR corrects_event_public_id IS NOT NULL),
  CONSTRAINT traceability_event_idempotency_unique
    UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS traceability_events_subject_time_idx
  ON traceability_events (tenant_id, subject_public_id, occurred_at, recorded_at);

CREATE INDEX IF NOT EXISTS traceability_events_correlation_idx
  ON traceability_events (tenant_id, correlation_id) WHERE correlation_id IS NOT NULL;

-- SSCC check digit, allocation/ownership, tenant authorization, cross-domain references,
-- and append-only event permissions must be validated by the Logistics domain service.
-- A valid SSCC check digit does not prove that the number was allocated to the submitter.
-- Corrections are new linked events; historical event rows must not be silently overwritten.
