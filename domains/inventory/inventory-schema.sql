CREATE TABLE IF NOT EXISTS domain_inventory (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('available','unavailable','reserved')),
  available_quantity NUMERIC(20,4) NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS domain_inventory_offer_idx ON domain_inventory(offer_id,updated_at DESC);