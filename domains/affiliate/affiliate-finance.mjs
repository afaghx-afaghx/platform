import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual
} from 'node:crypto';

const AMOUNT_PATTERN = /^(?:0|[1-9][0-9]{0,13})(?:\.[0-9]{1,6})?$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

function decimalToMicros(value, field = 'amount') {
  if (typeof value !== 'string' || !AMOUNT_PATTERN.test(value)) {
    throw new Error(`invalid_decimal:${field}`);
  }
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 1_000_000n + BigInt((fraction + '000000').slice(0, 6));
}

function microsToDecimal(value) {
  const amount = BigInt(value);
  const whole = amount / 1_000_000n;
  const fraction = String(amount % 1_000_000n).padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function requireTenant(securityContext) {
  if (!securityContext?.tenantId || !securityContext?.userId) {
    throw new Error('verified_security_context_required');
  }
  return securityContext.tenantId;
}

function requireOutbox(outbox) {
  if (!outbox || typeof outbox.append !== 'function') throw new Error('transactional_outbox_required');
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashPrivateValue(secret, label, value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  return createHmac('sha256', secret).update(label).update('\0').update(value).digest('hex');
}

function campaignEvent(type, tenantId, campaign, actorUserId, occurredAt) {
  const eventId = randomUUID();
  return {
    type,
    version: 'v1',
    metadata: {
      eventId,
      occurredAt: occurredAt.toISOString(),
      contractVersion: 'v1',
      correlationId: eventId,
      producer: 'domains.affiliate',
      tenantId
    },
    aggregate: { type: 'affiliate_campaign', id: campaign.campaign_id },
    payload: {
      campaignId: campaign.campaign_id,
      advertiserId: campaign.advertiser_id,
      status: campaign.status,
      actorUserId
    }
  };
}

function clickEvent(type, click, occurredAt, extra = {}) {
  const eventId = randomUUID();
  return {
    type,
    version: 'v1',
    metadata: {
      eventId,
      occurredAt: occurredAt.toISOString(),
      contractVersion: 'v1',
      correlationId: eventId,
      producer: 'domains.affiliate',
      tenantId: click.tenant_id
    },
    aggregate: { type: 'affiliate_click', id: click.click_id },
    payload: {
      clickId: click.click_id,
      campaignId: click.campaign_id,
      affiliateId: click.affiliate_id,
      status: click.status,
      riskScore: Number(click.risk_score || 0),
      ...extra
    }
  };
}

async function inTransaction(pool, operation) {
  const client = await pool.connect();
  let active = false;
  try {
    await client.query('BEGIN');
    active = true;
    const result = await operation(client);
    await client.query('COMMIT');
    active = false;
    return result;
  } catch (error) {
    if (active) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
    }
    throw error;
  } finally {
    client.release();
  }
}

async function accountId(client, tenantId, currency, code, type, name) {
  await client.query(
    `INSERT INTO afx_ledger_accounts (account_id, tenant_id, account_code, account_type, currency, account_name)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (tenant_id, account_code, currency) DO NOTHING`,
    [randomUUID(), tenantId, code, type, currency, name]
  );
  const result = await client.query(
    `SELECT account_id FROM afx_ledger_accounts
     WHERE tenant_id=$1 AND account_code=$2 AND currency=$3`,
    [tenantId, code, currency]
  );
  if (!result.rows[0]) throw new Error('ledger_account_unavailable');
  return result.rows[0].account_id;
}

async function insertLedgerEntry(client, {
  tenantId, transactionId, accountId: ledgerAccountId, direction, amount, currency, description
}) {
  const debit = direction === 'debit' ? amount : '0';
  const credit = direction === 'credit' ? amount : '0';
  await client.query(
    `INSERT INTO afx_ledger_entries
      (entry_id, tenant_id, transaction_id, account_id, currency, debit_amount, credit_amount, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [randomUUID(), tenantId, transactionId, ledgerAccountId, currency, debit, credit, description]
  );
}

async function postClickEarning(client, {
  outbox,
  click,
  campaign,
  actorUserId,
  occurredAt
}) {
  const grossMicros = decimalToMicros(String(campaign.cpc_amount), 'cpc_amount');
  const rewardMicros = decimalToMicros(String(campaign.affiliate_reward), 'affiliate_reward');
  const spentMicros = decimalToMicros(String(campaign.budget_spent), 'budget_spent');
  const budgetMicros = decimalToMicros(String(campaign.budget_total), 'budget_total');

  if (grossMicros <= 0n || rewardMicros <= 0n || rewardMicros > grossMicros) {
    throw new Error('campaign_financial_configuration_invalid');
  }

  if (spentMicros + grossMicros > budgetMicros) {
    await client.query(
      `UPDATE afx_affiliate_clicks SET status='rejected',
        rejection_code='campaign_budget_exhausted', reviewed_at=$3
       WHERE tenant_id=$1 AND click_id=$2`,
      [click.tenant_id, click.click_id, occurredAt]
    );
    await client.query(
      `UPDATE afx_affiliate_campaigns SET status='paused', updated_at=$3
       WHERE tenant_id=$1 AND campaign_id=$2`,
      [campaign.tenant_id, campaign.campaign_id, occurredAt]
    );
    const rejected = { ...click, status: 'rejected' };
    await outbox.append(client, clickEvent('affiliate.click.rejected', rejected, occurredAt, {
      rejectionCode: 'campaign_budget_exhausted'
    }));
    return { status: 'rejected', reason: 'campaign_budget_exhausted' };
  }

  const netMicros = grossMicros - rewardMicros;
  const currency = String(campaign.currency).trim();
  const receivable = await accountId(
    client, click.tenant_id, currency,
    'advertiser_receivable', 'asset', 'Advertiser receivable'
  );
  const payable = await accountId(
    client, click.tenant_id, currency,
    'affiliate_payable', 'liability', 'Affiliate payable'
  );
  let revenue = null;
  if (netMicros > 0n) {
    revenue = await accountId(
      client, click.tenant_id, currency,
      'platform_commission_revenue', 'revenue', 'Platform commission revenue'
    );
  }

  const transactionId = randomUUID();
  const gross = microsToDecimal(grossMicros);
  const reward = microsToDecimal(rewardMicros);
  await client.query(
    `INSERT INTO afx_ledger_transactions
      (transaction_id, tenant_id, source_type, source_id, posting_type,
       currency, total_debit, total_credit, status, created_by)
     VALUES ($1,$2,'affiliate.click',$3,'CPC_EARNING',$4,$5,$5,'posted',$6)`,
    [transactionId, click.tenant_id, click.click_id, currency, gross, actorUserId]
  );

  await insertLedgerEntry(client, {
    tenantId: click.tenant_id, transactionId, accountId: receivable,
    direction: 'debit', amount: gross, currency,
    description: `CPC receivable for click ${click.click_id}`
  });
  await insertLedgerEntry(client, {
    tenantId: click.tenant_id, transactionId, accountId: payable,
    direction: 'credit', amount: reward, currency,
    description: `Affiliate reward for click ${click.click_id}`
  });
  if (netMicros > 0n) {
    await insertLedgerEntry(client, {
      tenantId: click.tenant_id, transactionId, accountId: revenue,
      direction: 'credit', amount: microsToDecimal(netMicros), currency,
      description: `Platform commission for click ${click.click_id}`
    });
  }

  const newSpent = spentMicros + grossMicros;
  const nextCampaignStatus = newSpent >= budgetMicros ? 'paused' : campaign.status;
  await client.query(
    `UPDATE afx_affiliate_campaigns
     SET budget_spent=$3, status=$4, updated_at=$5
     WHERE tenant_id=$1 AND campaign_id=$2`,
    [campaign.tenant_id, campaign.campaign_id, microsToDecimal(newSpent), nextCampaignStatus, occurredAt]
  );
  await client.query(
    `UPDATE afx_affiliate_clicks
     SET status='qualified', qualified_at=$3, reviewed_by=$4,
         ledger_transaction_id=$5, earning_amount=$6, currency=$7
     WHERE tenant_id=$1 AND click_id=$2`,
    [click.tenant_id, click.click_id, occurredAt, actorUserId, transactionId, reward, currency]
  );

  const qualified = { ...click, status: 'qualified', risk_score: click.risk_score };
  await outbox.append(client, clickEvent('affiliate.click.qualified', qualified, occurredAt, {
    ledgerTransactionId: transactionId,
    earningAmount: reward,
    currency
  }));
  const ledgerEventId = randomUUID();
  await outbox.append(client, {
    type: 'finance.ledger.transaction.posted',
    version: 'v1',
    metadata: {
      eventId: ledgerEventId,
      occurredAt: occurredAt.toISOString(),
      contractVersion: 'v1',
      correlationId: ledgerEventId,
      producer: 'domains.affiliate',
      tenantId: click.tenant_id
    },
    aggregate: { type: 'ledger_transaction', id: transactionId },
    payload: {
      sourceType: 'affiliate.click',
      sourceId: click.click_id,
      currency,
      totalDebit: gross,
      totalCredit: gross
    }
  });

  return {
    status: 'qualified',
    clickId: click.click_id,
    ledgerTransactionId: transactionId,
    grossAmount: gross,
    affiliateReward: reward,
    platformCommission: microsToDecimal(netMicros),
    currency
  };
}

export async function ensureAffiliateFinanceSchema(pool) {
  await pool.query(`
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
    )
  `);
  await pool.query(`
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
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS afx_affiliate_click_visitor_idx
    ON afx_affiliate_clicks (tenant_id, campaign_id, visitor_hash, occurred_at DESC)
    WHERE visitor_hash IS NOT NULL
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS afx_affiliate_click_ip_idx
    ON afx_affiliate_clicks (tenant_id, campaign_id, ip_hash, occurred_at DESC)
    WHERE ip_hash IS NOT NULL
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS afx_affiliate_click_status_idx
    ON afx_affiliate_clicks (tenant_id, campaign_id, status, created_at DESC)
  `);
  await pool.query(`
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
    )
  `);
  await pool.query(`
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
    )
  `);
  await pool.query(`
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
    )
  `);
  await pool.query('ALTER TABLE afx_ledger_transactions ADD COLUMN IF NOT EXISTS reversal_of TEXT');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS afx_ledger_single_reversal_idx ON afx_ledger_transactions (tenant_id, reversal_of) WHERE reversal_of IS NOT NULL');
  await pool.query('ALTER TABLE afx_affiliate_clicks ADD COLUMN IF NOT EXISTS reversal_transaction_id TEXT');
  await pool.query('CREATE INDEX IF NOT EXISTS afx_ledger_tx_tenant_date_idx ON afx_ledger_transactions (tenant_id, created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS afx_ledger_entries_tx_idx ON afx_ledger_entries (tenant_id, transaction_id)');

  await pool.query(`
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
    $$
  `);
  await pool.query(`
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
    $triggers$
  `);
  await pool.query(`
    CREATE OR REPLACE FUNCTION afx_reject_ledger_mutation()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION 'ledger_is_append_only_use_reversal_transaction';
    END;
    $$
  `);
  await pool.query(`
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
    $triggers$
  `);
}

function verifyClickToken(token, secret, nowMs) {
  if (typeof token !== 'string' || token.length > 4096) throw new Error('invalid_click_token');
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('invalid_click_token');
  const [encoded, signature] = parts;
  const expected = createHmac('sha256', secret).update(encoded).digest();
  let supplied;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { throw new Error('invalid_click_token'); }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error('invalid_click_signature');
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { throw new Error('invalid_click_token'); }
  if (!payload?.tenantId || !payload?.campaignId || !payload?.affiliateId || !Number.isSafeInteger(payload.exp)) {
    throw new Error('invalid_click_token');
  }
  if (payload.exp <= Math.floor(nowMs / 1000)) throw new Error('click_token_expired');
  return payload;
}

export function createAffiliateFinanceService({
  pool,
  outbox,
  signingSecret = process.env.AFX_AFFILIATE_SIGNING_SECRET,
  privacyHashSecret = process.env.AFX_PRIVACY_HASH_SECRET,
  clock = () => new Date(),
  fraudPolicy = {}
} = {}) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('postgres_pool_required');
  requireOutbox(outbox);
  if (typeof signingSecret !== 'string' || Buffer.byteLength(signingSecret) < 32) {
    throw new Error('affiliate_signing_secret_min_32_bytes_required');
  }
  if (typeof privacyHashSecret !== 'string' || Buffer.byteLength(privacyHashSecret) < 32) {
    throw new Error('privacy_hash_secret_min_32_bytes_required');
  }

  const policy = Object.freeze({
    maxVisitorClicksPerHour: fraudPolicy.maxVisitorClicksPerHour ?? 5,
    maxIpClicksPerHour: fraudPolicy.maxIpClicksPerHour ?? 40,
    rejectRiskScore: fraudPolicy.rejectRiskScore ?? 70,
    reviewRiskScore: fraudPolicy.reviewRiskScore ?? 30
  });
  for (const [key, value] of Object.entries(policy)) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 100_000) throw new Error(`invalid_fraud_policy:${key}`);
  }
  if (policy.reviewRiskScore > policy.rejectRiskScore) throw new Error('invalid_fraud_policy_thresholds');

  function signToken(payload) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', signingSecret).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
  }

  async function createCampaign({ securityContext, input } = {}) {
    const tenantId = requireTenant(securityContext);
    if (!input || typeof input.name !== 'string' || input.name.trim().length < 2 || input.name.length > 160) {
      throw new Error('invalid_campaign_name');
    }
    if (typeof input.advertiserId !== 'string' || input.advertiserId.trim().length === 0) {
      throw new Error('advertiser_id_required');
    }
    const currency = input.currency;
    if (typeof currency !== 'string' || !CURRENCY_PATTERN.test(currency)) throw new Error('invalid_currency');
    const cpc = decimalToMicros(input.cpcAmount, 'cpc_amount');
    const reward = decimalToMicros(input.affiliateReward, 'affiliate_reward');
    const budget = decimalToMicros(input.budgetTotal, 'budget_total');
    if (cpc <= 0n || reward <= 0n || reward > cpc || budget < cpc) {
      throw new Error('invalid_campaign_financial_values');
    }

    const campaignId = randomUUID();
    const occurredAt = clock();
    const startsAt = input.startsAt ? new Date(input.startsAt) : occurredAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))) {
      throw new Error('invalid_campaign_dates');
    }

    return inTransaction(pool, async client => {
      const result = await client.query(
        `INSERT INTO afx_affiliate_campaigns
          (campaign_id,tenant_id,advertiser_id,name,currency,cpc_amount,affiliate_reward,
           budget_total,budget_spent,status,starts_at,ends_at,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,'active',$9,$10,$11)
         RETURNING campaign_id,tenant_id,advertiser_id,name,currency,cpc_amount,affiliate_reward,
                   budget_total,budget_spent,status,starts_at,ends_at,created_at`,
        [
          campaignId, tenantId, input.advertiserId, input.name.trim(), currency,
          microsToDecimal(cpc), microsToDecimal(reward), microsToDecimal(budget),
          startsAt, endsAt, securityContext.userId
        ]
      );
      const campaign = result.rows[0];
      await outbox.append(client, campaignEvent('affiliate.campaign.created', tenantId, campaign, securityContext.userId, occurredAt));
      return campaign;
    });
  }

  async function issueClickToken({ securityContext, campaignId, affiliateId, expiresInSeconds = 2_592_000 } = {}) {
    const tenantId = requireTenant(securityContext);
    if (typeof affiliateId !== 'string' || !affiliateId.trim()) throw new Error('affiliate_id_required');
    if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds < 60 || expiresInSeconds > 31_536_000) {
      throw new Error('click_token_ttl_invalid');
    }
    const result = await pool.query(
      `SELECT campaign_id,status,starts_at,ends_at
       FROM afx_affiliate_campaigns WHERE tenant_id=$1 AND campaign_id=$2`,
      [tenantId, campaignId]
    );
    const campaign = result.rows[0];
    const now = clock();
    if (!campaign || campaign.status !== 'active' || new Date(campaign.starts_at) > now
      || (campaign.ends_at && new Date(campaign.ends_at) <= now)) {
      throw new Error('campaign_not_active');
    }
    return {
      token: signToken({
        tenantId,
        campaignId,
        affiliateId: affiliateId.trim(),
        exp: Math.floor(now.getTime() / 1000) + expiresInSeconds
      }),
      expiresAt: new Date(now.getTime() + expiresInSeconds * 1000).toISOString()
    };
  }

  async function recordClick({
    token,
    clickRequestId,
    visitorKey,
    ipAddress,
    userAgent,
    referrer,
    requestId
  } = {}) {
    if (typeof clickRequestId !== 'string' || !IDEMPOTENCY_PATTERN.test(clickRequestId)) {
      throw new Error('invalid_click_request_id');
    }
    const now = clock();
    const tokenPayload = verifyClickToken(token, signingSecret, now.getTime());
    const visitorHash = hashPrivateValue(privacyHashSecret, 'visitor', visitorKey);
    const ipHash = hashPrivateValue(privacyHashSecret, 'ip', ipAddress);
    const userAgentHash = hashPrivateValue(privacyHashSecret, 'ua', userAgent);
    let referrerHost = null;
    if (typeof referrer === 'string' && referrer.length <= 2048) {
      try { referrerHost = new URL(referrer).hostname.toLowerCase().slice(0, 255) || null; } catch { referrerHost = null; }
    }
    const requestFingerprint = sha256(JSON.stringify(canonical({
      tenantId: tokenPayload.tenantId,
      campaignId: tokenPayload.campaignId,
      affiliateId: tokenPayload.affiliateId,
      visitorHash,
      ipHash,
      userAgentHash,
      referrerHost
    })));

    return inTransaction(pool, async client => {
      const campaignResult = await client.query(
        `SELECT * FROM afx_affiliate_campaigns
         WHERE tenant_id=$1 AND campaign_id=$2
         FOR UPDATE`,
        [tokenPayload.tenantId, tokenPayload.campaignId]
      );
      const campaign = campaignResult.rows[0];
      if (!campaign || campaign.status !== 'active' || new Date(campaign.starts_at) > now
        || (campaign.ends_at && new Date(campaign.ends_at) <= now)) {
        throw new Error('campaign_not_active');
      }

      const insert = await client.query(
        `INSERT INTO afx_affiliate_clicks
          (click_id,tenant_id,campaign_id,affiliate_id,click_request_id,request_fingerprint,
           visitor_hash,ip_hash,user_agent_hash,referrer_host,status,occurred_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'raw',$11)
         ON CONFLICT (tenant_id,click_request_id) DO NOTHING
         RETURNING *`,
        [
          randomUUID(), tokenPayload.tenantId, tokenPayload.campaignId, tokenPayload.affiliateId,
          clickRequestId, requestFingerprint, visitorHash, ipHash, userAgentHash, referrerHost, now
        ]
      );
      if (insert.rowCount === 0) {
        const existingResult = await client.query(
          `SELECT click_id,tenant_id,campaign_id,affiliate_id,request_fingerprint,status,
                  risk_score,rejection_code,ledger_transaction_id,earning_amount,currency
           FROM afx_affiliate_clicks WHERE tenant_id=$1 AND click_request_id=$2 FOR UPDATE`,
          [tokenPayload.tenantId, clickRequestId]
        );
        const existing = existingResult.rows[0];
        if (!existing) throw new Error('click_idempotency_state_unavailable');
        if (existing.request_fingerprint !== requestFingerprint) {
          throw Object.assign(new Error('click_request_id_reused'), { status: 409 });
        }
        return {
          replayed: true,
          clickId: existing.click_id,
          status: existing.status,
          riskScore: Number(existing.risk_score),
          rejectionCode: existing.rejection_code,
          ledgerTransactionId: existing.ledger_transaction_id,
          earningAmount: existing.earning_amount,
          currency: existing.currency
        };
      }

      const click = insert.rows[0];
      const flags = [];
      let riskScore = 0;
      if (!visitorHash) { riskScore += 35; flags.push('missing_visitor_fingerprint'); }
      if (!ipHash) { riskScore += 30; flags.push('missing_network_fingerprint'); }
      if (!userAgentHash) { riskScore += 10; flags.push('missing_user_agent_fingerprint'); }

      const counts = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE visitor_hash=$3) AS visitor_count,
          COUNT(*) FILTER (WHERE ip_hash=$4) AS ip_count
         FROM afx_affiliate_clicks
         WHERE tenant_id=$1 AND campaign_id=$2
           AND occurred_at >= $5::timestamptz - INTERVAL '1 hour'
           AND click_id <> $6`,
        [tokenPayload.tenantId, tokenPayload.campaignId, visitorHash, ipHash, now, click.click_id]
      );
      const visitorCount = Number(counts.rows[0]?.visitor_count || 0);
      const ipCount = Number(counts.rows[0]?.ip_count || 0);
      if (visitorHash && visitorCount >= policy.maxVisitorClicksPerHour) {
        riskScore += 35;
        flags.push('visitor_click_velocity');
      }
      if (ipHash && ipCount >= policy.maxIpClicksPerHour) {
        riskScore += 35;
        flags.push('network_click_velocity');
      }
      riskScore = Math.min(100, riskScore);

      let status = 'qualified';
      if (riskScore >= policy.rejectRiskScore) status = 'rejected';
      else if (riskScore >= policy.reviewRiskScore) status = 'pending_review';
      const rejectionCode = status === 'rejected' ? 'fraud_risk_threshold' : null;

      const persistedStatus = status === 'qualified' ? 'raw' : status;
      await client.query(
        `UPDATE afx_affiliate_clicks
         SET status=$3,risk_score=$4,risk_flags=$5::jsonb,rejection_code=$6
         WHERE tenant_id=$1 AND click_id=$2`,
        [tokenPayload.tenantId, click.click_id, persistedStatus, riskScore, JSON.stringify(flags), rejectionCode]
      );
      const finalClick = { ...click, status: persistedStatus, risk_score: riskScore };
      await outbox.append(client, clickEvent('affiliate.click.recorded', finalClick, now, {
        requestId: requestId || null,
        riskFlags: flags
      }));

      if (status === 'qualified') {
        const earning = await postClickEarning(client, {
          outbox, click: finalClick, campaign, actorUserId: 'system:fraud-policy', occurredAt: now
        });
        return {
          replayed: false,
          clickId: click.click_id,
          ...earning,
          riskScore
        };
      }

      if (status === 'rejected') {
        await outbox.append(client, clickEvent('affiliate.click.rejected', finalClick, now, {
          rejectionCode
        }));
      }
      return {
        replayed: false,
        clickId: click.click_id,
        status,
        riskScore,
        rejectionCode
      };
    });
  }

  async function reviewClick({ securityContext, clickId, decision } = {}) {
    const tenantId = requireTenant(securityContext);
    if (!['approve', 'reject'].includes(decision)) throw new Error('invalid_click_review_decision');
    const now = clock();
    return inTransaction(pool, async client => {
      const clickResult = await client.query(
        `SELECT * FROM afx_affiliate_clicks
         WHERE tenant_id=$1 AND click_id=$2 FOR UPDATE`,
        [tenantId, clickId]
      );
      const click = clickResult.rows[0];
      if (!click) throw new Error('click_not_found');
      if (click.status !== 'pending_review') throw Object.assign(new Error('click_not_pending_review'), { status: 409 });

      if (decision === 'reject') {
        await client.query(
          `UPDATE afx_affiliate_clicks SET status='rejected',
             rejection_code='manual_fraud_review',reviewed_at=$3,reviewed_by=$4
           WHERE tenant_id=$1 AND click_id=$2`,
          [tenantId, clickId, now, securityContext.userId]
        );
        await outbox.append(client, clickEvent('affiliate.click.rejected', { ...click, status: 'rejected' }, now, {
          rejectionCode: 'manual_fraud_review',
          reviewerUserId: securityContext.userId
        }));
        return { clickId, status: 'rejected' };
      }

      const campaignResult = await client.query(
        `SELECT * FROM afx_affiliate_campaigns
         WHERE tenant_id=$1 AND campaign_id=$2 FOR UPDATE`,
        [tenantId, click.campaign_id]
      );
      const campaign = campaignResult.rows[0];
      if (!campaign || !['active', 'paused'].includes(campaign.status)) throw new Error('campaign_not_eligible_for_earning');
      if (campaign.status === 'paused' && campaign.budget_spent >= campaign.budget_total) {
        throw new Error('campaign_budget_exhausted');
      }
      return postClickEarning(client, {
        outbox,
        click,
        campaign,
        actorUserId: securityContext.userId,
        occurredAt: now
      });
    });
  }

  async function reverseLedgerTransaction({ securityContext, transactionId, reason } = {}) {
    const tenantId = requireTenant(securityContext);
    if (typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 240) {
      throw new Error('ledger_reversal_reason_required');
    }
    const now = clock();
    return inTransaction(pool, async client => {
      const originalResult = await client.query(
        `SELECT * FROM afx_ledger_transactions
         WHERE tenant_id=$1 AND transaction_id=$2 FOR UPDATE`,
        [tenantId, transactionId]
      );
      const original = originalResult.rows[0];
      if (!original) throw new Error('ledger_transaction_not_found');
      if (original.source_type === 'ledger.reversal' || original.status !== 'posted') {
        throw Object.assign(new Error('ledger_transaction_not_reversible'), { status: 409 });
      }
      const previous = await client.query(
        `SELECT transaction_id FROM afx_ledger_transactions
         WHERE tenant_id=$1 AND reversal_of=$2`,
        [tenantId, transactionId]
      );
      if (previous.rows[0]) return { replayed: true, reversalTransactionId: previous.rows[0].transaction_id };

      const originalEntries = await client.query(
        `SELECT account_id,currency,debit_amount,credit_amount,description
         FROM afx_ledger_entries WHERE tenant_id=$1 AND transaction_id=$2
         ORDER BY created_at,entry_id`,
        [tenantId, transactionId]
      );
      if (originalEntries.rows.length < 2) throw new Error('ledger_original_entries_missing');

      const reversalId = randomUUID();
      await client.query(
        `INSERT INTO afx_ledger_transactions
          (transaction_id,tenant_id,source_type,source_id,posting_type,currency,
           total_debit,total_credit,status,created_by,reversal_of)
         VALUES ($1,$2,'ledger.reversal',$3,'REVERSAL',$4,$5,$5,'posted',$6,$3)`,
        [reversalId, tenantId, transactionId, original.currency, String(original.total_debit), securityContext.userId]
      );
      for (const entry of originalEntries.rows) {
        await client.query(
          `INSERT INTO afx_ledger_entries
            (entry_id,tenant_id,transaction_id,account_id,currency,debit_amount,credit_amount,description)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            randomUUID(), tenantId, reversalId, entry.account_id, entry.currency,
            String(entry.credit_amount), String(entry.debit_amount),
            `REVERSAL: ${reason.trim().slice(0, 180)}`
          ]
        );
      }

      const clickSource = original.source_type === 'affiliate.click' ? original.source_id : null;
      if (clickSource) {
        await client.query(
          `UPDATE afx_affiliate_clicks
           SET status='reversed',reversal_transaction_id=$3
           WHERE tenant_id=$1 AND click_id=$2 AND status='qualified'`,
          [tenantId, clickSource, reversalId]
        );
      }
      const eventId = randomUUID();
      await outbox.append(client, {
        type: 'finance.ledger.transaction.reversed',
        version: 'v1',
        metadata: {
          eventId,
          occurredAt: now.toISOString(),
          contractVersion: 'v1',
          correlationId: eventId,
          producer: 'domains.affiliate',
          tenantId
        },
        aggregate: { type: 'ledger_transaction', id: reversalId },
        payload: {
          reversalTransactionId: reversalId,
          originalTransactionId: transactionId,
          sourceType: original.source_type,
          sourceId: original.source_id,
          currency: String(original.currency).trim(),
          amount: String(original.total_debit),
          reason: reason.trim().slice(0, 180)
        }
      });
      return { replayed: false, reversalTransactionId: reversalId, originalTransactionId: transactionId };
    });
  }

  async function getLedgerTransaction({ securityContext, transactionId } = {}) {
    const tenantId = requireTenant(securityContext);
    const headerResult = await pool.query(
      `SELECT transaction_id,source_type,source_id,posting_type,currency,
              total_debit,total_credit,status,created_by,created_at
       FROM afx_ledger_transactions
       WHERE tenant_id=$1 AND transaction_id=$2`,
      [tenantId, transactionId]
    );
    const header = headerResult.rows[0];
    if (!header) return null;
    const entries = await pool.query(
      `SELECT e.entry_id,e.account_id,a.account_code,a.account_name,a.account_type,
              e.currency,e.debit_amount,e.credit_amount,e.description,e.created_at
       FROM afx_ledger_entries e
       JOIN afx_ledger_accounts a
         ON a.tenant_id=e.tenant_id AND a.account_id=e.account_id
       WHERE e.tenant_id=$1 AND e.transaction_id=$2
       ORDER BY e.created_at,e.entry_id`,
      [tenantId, transactionId]
    );
    return { ...header, entries: entries.rows };
  }

  async function listLedger({ securityContext, limit = 50, before = null } = {}) {
    const tenantId = requireTenant(securityContext);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new Error('ledger_page_size_invalid');
    const result = await pool.query(
      `SELECT transaction_id,source_type,source_id,posting_type,currency,
              total_debit,total_credit,status,created_by,created_at
       FROM afx_ledger_transactions
       WHERE tenant_id=$1 AND ($2::timestamptz IS NULL OR created_at < $2)
       ORDER BY created_at DESC,transaction_id DESC
       LIMIT $3`,
      [tenantId, before, limit]
    );
    return result.rows;
  }

  return Object.freeze({
    createCampaign,
    issueClickToken,
    recordClick,
    reviewClick,
    reverseLedgerTransaction,
    getLedgerTransaction,
    listLedger
  });
}

export const affiliateFinanceInternals = Object.freeze({
  decimalToMicros,
  microsToDecimal,
  verifyClickToken
});
