BEGIN;

CREATE TABLE IF NOT EXISTS afx_organizations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS afx_tenants (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES afx_organizations(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'afx_memberships_tenant_fk') THEN
    ALTER TABLE afx_memberships ADD CONSTRAINT afx_memberships_tenant_fk FOREIGN KEY (tenant_id) REFERENCES afx_tenants(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'afx_sessions_tenant_fk') THEN
    ALTER TABLE afx_sessions ADD CONSTRAINT afx_sessions_tenant_fk FOREIGN KEY (tenant_id) REFERENCES afx_tenants(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'afx_refresh_families_tenant_fk') THEN
    ALTER TABLE afx_refresh_families ADD CONSTRAINT afx_refresh_families_tenant_fk FOREIGN KEY (tenant_id) REFERENCES afx_tenants(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS afx_tenants_organization_idx ON afx_tenants (organization_id, status);
CREATE INDEX IF NOT EXISTS afx_tenants_status_idx ON afx_tenants (id, status);

COMMIT;
