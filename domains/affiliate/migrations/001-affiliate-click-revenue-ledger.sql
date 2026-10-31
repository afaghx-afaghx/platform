-- AFX-AFFILIATE-FINANCE-MIGRATION-001
-- Apply after the transactional outbox migration (002).
-- All money values use NUMERIC(20,6). Posted ledger data is append-only.
BEGIN;
SELECT pg_advisory_xact_lock(875, 2);

CREATE TABLE IF NOT EXISTS afx_affiliate_campaigns (
  campaign_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  advertiser_id TEXT NOT NULL,
  name TEXT NOT NULL,
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  cpc_amount NUMERIC(20,6) NOT NULL CHECK (cpc_amount > 0),
  affiliate_reward NUMERIC(20,6) NOT NULL CHECK (affiliate_reward > 0 AND affiliate_reward <= cpc_amount),
  budget_total NUMERIC(20,6) NOT NULL CHECK (budget_total > 0),
  budget_spent NUMERIC(20,6) NOT NULL DEFAULT 0 CHECK (budget_spent >= 0 AND budget_spent <= budget_total),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, campaign_id),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS afx_affiliate_clicks (
  click_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  affiliate_id TEXT NOT NULL,
  click_request_id TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  visitor_hash TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  referrer_host TEXT,
  risk_score SMALLINT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('raw','pending_review','qualified','rejected','reversed')),
  rejection_code TEXT,
  ledger_transaction_id TEXT,
  reversal_transaction_id TEXT,
  earning_amount NUMERIC(20,6),
  currency CHAR(3),
  occurred_at TIMESTAMPTZ NOT NULL,
  qualified_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, click_request_id),
  UNIQUE (tenant_id, click_id),
  FOREIGN KEY (tenant_id, campaign_id) REFERENCES afx_affiliate_campaigns (tenant_id, campaign_id),
  CHECK (
    (status = 'qualified' AND ledger_transaction_id IS NOT NULL AND reversal_transaction_id IS NULL AND earning_amount IS NOT NULL AND currency IS NOT NULL)
    OR (status = 'reversed' AND ledger_transaction_id IS NOT NULL AND reversal_transaction_id IS NOT NULL)
    OR (status IN ('raw','pending_review','rejected') AND ledger_transaction_id IS NULL AND reversal_transaction_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS afx_affiliate_click_visitor_idx
  ON afx_affiliate_clicks (tenant_id, campaign_id, visitor_hash, occurred_at DESC)
  WHERE visitor_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS afx_affiliate_click_ip_idx
  ON afx_affiliate_clicks (tenant_id, campaign_id, ip_hash, occurred_at DESC)
  WHERE ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS afx_affiliate_click_status_idx
  ON afx_affiliate_clicks (tenant_id, campaign_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS afx_ledger_accounts (
  account_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  account_code TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  account_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, account_code, currency),
  UNIQUE (tenant_id, account_id)
);

CREATE TABLE IF NOT EXISTS afx_ledger_transactions (
  transaction_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  posting_type TEXT NOT NULL,
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  total_debit NUMERIC(20,6) NOT NULL CHECK (total_debit > 0),
  total_credit NUMERIC(20,6) NOT NULL CHECK (total_credit > 0),
  status TEXT NOT NULL CHECK (status = 'posted'),
  created_by TEXT NOT NULL,
  reversal_of TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, transaction_id),
  UNIQUE (tenant_id, source_type, source_id, posting_type)
);
CREATE UNIQUE INDEX IF NOT EXISTS afx_ledger_single_reversal_idx
  ON afx_ledger_transactions (tenant_id, reversal_of) WHERE reversal_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS afx_ledger_tx_tenant_date_idx
  ON afx_ledger_transactions (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS afx_ledger_entries (
  entry_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  debit_amount NUMERIC(20,6) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount NUMERIC(20,6) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, transaction_id) REFERENCES afx_ledger_transactions (tenant_id, transaction_id),
  FOREIGN KEY (tenant_id, account_id) REFERENCES afx_ledger_accounts (tenant_id, account_id),
  CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
);
CREATE INDEX IF NOT EXISTS afx_ledger_entries_tx_idx
  ON afx_ledger_entries (tenant_id, transaction_id);

CREATE OR REPLACE FUNCTION afx_assert_affiliate_journal_balanced()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_id TEXT;
  header RECORD;
  entry_count BIGINT;
  debit_total NUMERIC(20,6);
  credit_total NUMERIC(20,6);
  currency_count BIGINT;
BEGIN
  target_id := NEW.transaction_id;
  SELECT * INTO header FROM afx_ledger_transactions WHERE transaction_id=target_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ledger_transaction_missing'; END IF;
  SELECT COUNT(*), COALESCE(SUM(debit_amount),0), COALESCE(SUM(credit_amount),0),
         COUNT(DISTINCT currency)
    INTO entry_count, debit_total, credit_total, currency_count
    FROM afx_ledger_entries WHERE transaction_id=target_id;
  IF entry_count < 2 OR debit_total <> credit_total
     OR debit_total <> header.total_debit OR credit_total <> header.total_credit
     OR currency_count <> 1
     OR EXISTS (SELECT 1 FROM afx_ledger_entries WHERE transaction_id=target_id AND currency <> header.currency) THEN
    RAISE EXCEPTION 'ledger_transaction_unbalanced';
  END IF;
  RETURN NULL;
END;
$$;

DO $triggers$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='afx_ledger_balance_header') THEN
    CREATE CONSTRAINT TRIGGER afx_ledger_balance_header
    AFTER INSERT ON afx_ledger_transactions
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION afx_assert_affiliate_journal_balanced();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='afx_ledger_balance_entry') THEN
    CREATE CONSTRAINT TRIGGER afx_ledger_balance_entry
    AFTER INSERT ON afx_ledger_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION afx_assert_affiliate_journal_balanced();
  END IF;
END;
$triggers$;

CREATE OR REPLACE FUNCTION afx_reject_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ledger_is_append_only_use_reversal_transaction';
END;
$$;

DO $triggers$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='afx_ledger_transaction_immutable') THEN
    CREATE TRIGGER afx_ledger_transaction_immutable
    BEFORE UPDATE OR DELETE ON afx_ledger_transactions
    FOR EACH ROW EXECUTE FUNCTION afx_reject_ledger_mutation();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='afx_ledger_entry_immutable') THEN
    CREATE TRIGGER afx_ledger_entry_immutable
    BEFORE UPDATE OR DELETE ON afx_ledger_entries
    FOR EACH ROW EXECUTE FUNCTION afx_reject_ledger_mutation();
  END IF;
END;
$triggers$;

COMMIT;
