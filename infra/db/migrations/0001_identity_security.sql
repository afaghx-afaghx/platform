CREATE TABLE tenants (
  id uuid PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('active','suspended','deleted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identities (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  status text NOT NULL CHECK (status IN ('active','locked','disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX identities_tenant_idx ON identities(tenant_id);

CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  identity_id uuid NOT NULL REFERENCES identities(id),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  refresh_family_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoke_reason text
);
CREATE INDEX sessions_identity_idx ON sessions(identity_id);
CREATE INDEX sessions_tenant_idx ON sessions(tenant_id);
CREATE INDEX sessions_family_idx ON sessions(refresh_family_id);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id),
  family_id uuid NOT NULL,
  token_hash char(64) NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens(family_id);

CREATE TABLE memberships (
  id uuid PRIMARY KEY,
  identity_id uuid NOT NULL REFERENCES identities(id),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  organization_id uuid,
  status text NOT NULL CHECK (status IN ('active','suspended','revoked')),
  UNIQUE(identity_id, tenant_id, organization_id)
);
CREATE INDEX memberships_tenant_idx ON memberships(tenant_id);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  tenant_id uuid,
  subject_id uuid,
  session_id uuid,
  event_type text NOT NULL,
  action text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success','denied','failure')),
  occurred_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_events_tenant_time_idx ON audit_events(tenant_id, occurred_at DESC);
