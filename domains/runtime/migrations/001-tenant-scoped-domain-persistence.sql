-- AFX-DATA-MIGRATION-001
-- Safe additive migration from payload-only tenant ownership.
-- Known tenant ids are backfilled from payload.tenantId. Legacy rows without
-- a tenant are quarantined (tenant_id remains NULL) and stay unreadable through
-- tenant-scoped application queries until reconciled by an authorized operator.
BEGIN;

DO $migration$
DECLARE
  table_name TEXT;
  constraint_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'domain_product', 'domain_commerce', 'domain_order', 'domain_factory',
    'domain_supplier', 'domain_service', 'domain_partner', 'domain_marketing',
    'domain_advertising', 'domain_logistics', 'domain_payment'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id TEXT', table_name);
    EXECUTE format(
      'UPDATE %I SET tenant_id = payload->>''tenantId'' WHERE tenant_id IS NULL AND payload ? ''tenantId''',
      table_name
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, id)',
      table_name || '_tenant_id_idx',
      table_name
    );
    constraint_name := table_name || '_tenant_id_present';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = constraint_name AND conrelid = to_regclass(table_name)
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I CHECK (tenant_id IS NOT NULL) NOT VALID',
        table_name,
        constraint_name
      );
    END IF;
  END LOOP;
END;
$migration$;

CREATE TABLE IF NOT EXISTS domain_idempotency (
  tenant_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT,
  status INTEGER NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, idempotency_key)
);

ALTER TABLE domain_idempotency ADD COLUMN IF NOT EXISTS request_hash TEXT;
ALTER TABLE domain_idempotency ALTER COLUMN response DROP NOT NULL;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'domain_idempotency_request_hash_present'
      AND conrelid = 'domain_idempotency'::regclass
  ) THEN
    ALTER TABLE domain_idempotency
      ADD CONSTRAINT domain_idempotency_request_hash_present
      CHECK (request_hash IS NOT NULL AND request_hash ~ '^[0-9a-f]{64}$') NOT VALID;
  END IF;
END;
$migration$;

COMMIT;
