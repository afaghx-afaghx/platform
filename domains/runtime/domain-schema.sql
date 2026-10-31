-- AFX-DOMAIN-RUNTIME-002
-- Each bounded context owns its table. Tenant ownership is a first-class
-- relational column. payload.tenantId is retained only as an API compatibility
-- mirror and is never used as the persistence isolation predicate.
CREATE TABLE IF NOT EXISTS domain_product (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL, name TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS domain_commerce (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL, name TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS domain_order (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL, customer_id TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS domain_factory (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL, name TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS domain_supplier (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL, name TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS domain_service (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL, name TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS domain_partner (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL, name TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS domain_marketing (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL, name TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS domain_advertising (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL, name TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS domain_logistics (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL, order_id TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS domain_payment (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL, amount NUMERIC(20,6) NOT NULL CHECK (amount > 0), currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'), payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS domain_product_tenant_id_idx ON domain_product (tenant_id, id);
CREATE INDEX IF NOT EXISTS domain_commerce_tenant_id_idx ON domain_commerce (tenant_id, id);
CREATE INDEX IF NOT EXISTS domain_order_tenant_id_idx ON domain_order (tenant_id, id);
CREATE INDEX IF NOT EXISTS domain_factory_tenant_id_idx ON domain_factory (tenant_id, id);
CREATE INDEX IF NOT EXISTS domain_supplier_tenant_id_idx ON domain_supplier (tenant_id, id);
CREATE INDEX IF NOT EXISTS domain_service_tenant_id_idx ON domain_service (tenant_id, id);
CREATE INDEX IF NOT EXISTS domain_partner_tenant_id_idx ON domain_partner (tenant_id, id);
CREATE INDEX IF NOT EXISTS domain_marketing_tenant_id_idx ON domain_marketing (tenant_id, id);
CREATE INDEX IF NOT EXISTS domain_advertising_tenant_id_idx ON domain_advertising (tenant_id, id);
CREATE INDEX IF NOT EXISTS domain_logistics_tenant_id_idx ON domain_logistics (tenant_id, id);
CREATE INDEX IF NOT EXISTS domain_payment_tenant_id_idx ON domain_payment (tenant_id, id);

-- One reservation and the associated business write are committed together.
CREATE TABLE IF NOT EXISTS domain_idempotency (
  tenant_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  status INTEGER NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, idempotency_key),
  CHECK (status = 0 OR status BETWEEN 200 AND 599)
);
