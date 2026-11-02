-- AFA CODE product-domain schema proposal.
-- Review/approval and migration integration are required before production execution.
-- Product domain owns these tables. Cross-domain references intentionally have no FK.
-- PostgreSQL; compatible with existing domain_product UUID-as-TEXT primary keys.

CREATE TABLE IF NOT EXISTS product_identity (
  internal_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  product_record_id TEXT NOT NULL UNIQUE REFERENCES domain_product(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT product_identity_public_id_format
    CHECK (public_id ~ '^AFA-PRD-[A-Za-z0-9_-]{16,64}$'),
  CONSTRAINT product_identity_internal_id_nonempty
    CHECK (length(internal_id) BETWEEN 1 AND 160),
  CONSTRAINT product_identity_tenant_nonempty
    CHECK (length(tenant_id) BETWEEN 1 AND 160)
);

CREATE TABLE IF NOT EXISTS product_variants (
  internal_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  product_internal_id TEXT NOT NULL REFERENCES product_identity(internal_id) ON DELETE RESTRICT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifecycle_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_state IN ('draft', 'active', 'suspended', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_variant_public_id_format
    CHECK (public_id ~ '^AFA-VAR-[A-Za-z0-9_-]{16,64}$')
);

CREATE TABLE IF NOT EXISTS trade_items (
  internal_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  variant_internal_id TEXT NOT NULL REFERENCES product_variants(internal_id) ON DELETE RESTRICT,
  unit_of_measure TEXT NOT NULL,
  packaging_description TEXT,
  lifecycle_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_state IN ('draft', 'active', 'suspended', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trade_item_public_id_format
    CHECK (public_id ~ '^AFA-TI-[A-Za-z0-9_-]{16,64}$'),
  CONSTRAINT trade_item_unit_nonempty CHECK (length(unit_of_measure) BETWEEN 1 AND 32)
);

CREATE TABLE IF NOT EXISTS product_external_identifiers (
  internal_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PRD', 'VAR', 'TI', 'LU')),
  entity_public_id TEXT NOT NULL,
  scheme TEXT NOT NULL CHECK (scheme ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
  value_normalized TEXT NOT NULL,
  uniqueness_scope TEXT NOT NULL,
  issuing_authority TEXT,
  jurisdiction TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected', 'needs_information', 'suspended', 'revoked')),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  evidence_document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT external_identifier_public_id_format
    CHECK (public_id ~ '^AFA-[A-Z]{2,3}-[A-Za-z0-9_-]{16,64}$'),
  CONSTRAINT external_identifier_value_nonempty
    CHECK (length(value_normalized) BETWEEN 1 AND 128),
  CONSTRAINT external_identifier_scope_nonempty
    CHECK (length(uniqueness_scope) BETWEEN 1 AND 128),
  CONSTRAINT external_identifier_validity_order
    CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from),
  CONSTRAINT external_identifier_scheme_value_scope_unique
    UNIQUE (scheme, value_normalized, uniqueness_scope)
);

CREATE INDEX IF NOT EXISTS product_external_identifiers_entity_idx
  ON product_external_identifiers (entity_type, entity_public_id);

CREATE INDEX IF NOT EXISTS product_external_identifiers_tenant_status_idx
  ON product_external_identifiers (tenant_id, verification_status);

CREATE TABLE IF NOT EXISTS product_market_profiles (
  internal_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  product_internal_id TEXT NOT NULL REFERENCES product_identity(internal_id) ON DELETE RESTRICT,
  jurisdiction_code TEXT NOT NULL,
  profile_version INTEGER NOT NULL DEFAULT 1 CHECK (profile_version > 0),
  compliance_status TEXT NOT NULL DEFAULT 'unassessed'
    CHECK (compliance_status IN ('unassessed', 'in_review', 'compliant', 'non_compliant', 'needs_information', 'expired', 'revoked')),
  hs_code TEXT,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT market_profile_public_id_format
    CHECK (public_id ~ '^AFA-[A-Z]{2,3}-[A-Za-z0-9_-]{16,64}$'),
  CONSTRAINT market_profile_jurisdiction_nonempty
    CHECK (length(jurisdiction_code) BETWEEN 2 AND 64),
  CONSTRAINT market_profile_validity_order
    CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from),
  CONSTRAINT product_market_profile_version_unique
    UNIQUE (product_internal_id, jurisdiction_code, profile_version)
);

CREATE INDEX IF NOT EXISTS product_market_profiles_tenant_jurisdiction_idx
  ON product_market_profiles (tenant_id, jurisdiction_code, compliance_status);

-- Important implementation requirements not expressible by this schema alone:
-- 1. Every query/write must scope tenant_id from validated AFX-CORE SecurityContext.
-- 2. Scheme-specific uniqueness_scope normalization must be enforced by domain service.
-- 3. GTIN/SSCC checksum validation does not establish allocation/ownership.
-- 4. entity_public_id references to Factory/Logistics are checked through their contracts,
--    never by direct cross-domain table access.
-- 5. Audit and verification decisions must be appended through approved domain/Core interfaces.
-- 6. Do not execute until the migration/rollback plan and existing schema compatibility are tested.
