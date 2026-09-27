CREATE TABLE IF NOT EXISTS domain_offer (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('draft','active','paused','expired')),
  currency TEXT NOT NULL,
  price NUMERIC(20,4) NOT NULL CHECK (price >= 0),
  minimum_order_quantity NUMERIC(20,4),
  lead_time_days INTEGER,
  availability_policy TEXT,
  trade_terms JSONB,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS domain_offer_product_idx ON domain_offer(product_id,state,created_at);
CREATE INDEX IF NOT EXISTS domain_offer_org_idx ON domain_offer(organization_id,state);