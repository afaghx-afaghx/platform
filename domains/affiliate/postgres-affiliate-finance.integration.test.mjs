import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createAffiliateFinanceService, ensureAffiliateFinanceSchema } from './affiliate-finance.mjs';
import { createPostgresOutboxStore, ensureOutboxSchema } from '../runtime/outbox.mjs';

const require = createRequire(new URL('../../core/AFX-CORE/package.json', import.meta.url));
const { Pool } = require('pg');
const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, max: 12 }) : null;
after(async () => { await pool?.end(); });

const signingSecret = 'test-signing-secret-'.padEnd(40, 's');
const privacyHashSecret = 'test-privacy-secret-'.padEnd(40, 'p');

function context(tenantId) {
  return Object.freeze({ tenantId, userId: 'finance-reviewer-1', roles: Object.freeze(['finance-reviewer']) });
}

async function fixture({ fraudPolicy, outbox } = {}) {
  await ensureOutboxSchema(pool);
  await ensureAffiliateFinanceSchema(pool);
  const service = createAffiliateFinanceService({
    pool,
    outbox: outbox || createPostgresOutboxStore(pool),
    signingSecret,
    privacyHashSecret,
    fraudPolicy
  });
  return service;
}

async function campaignFor(service, tenantId, {
  budgetTotal = '10.000000',
  cpcAmount = '0.010000',
  affiliateReward = '0.007500',
  currency = 'EUR',
  advertiserId = 'advertiser-1'
} = {}) {
  return service.createCampaign({
    securityContext: context(tenantId),
    input: {
      name: 'Affiliate campaign ' + randomUUID(),
      advertiserId,
      currency,
      cpcAmount,
      affiliateReward,
      budgetTotal
    }
  });
}

async function issueToken(service, tenantId, campaignId, affiliateId = 'affiliate-1') {
  return service.issueClickToken({
    securityContext: context(tenantId),
    campaignId,
    affiliateId
  });
}

function clickInput(token, clickRequestId, {
  visitorKey = 'browser-visitor-001',
  ipAddress = '203.0.113.10',
  userAgent = 'Mozilla/5.0 AFAGHX Integration Test',
  referrer = 'https://publisher.example/article/1'
} = {}) {
  return { token: token.token, clickRequestId, visitorKey, ipAddress, userAgent, referrer, requestId: randomUUID() };
}

test('qualified CPC click posts a balanced double-entry journal and replays idempotently', { skip: !databaseUrl }, async () => {
  const tenantId = 'tenant-aff-' + randomUUID();
  const service = await fixture();
  const campaign = await campaignFor(service, tenantId);
  const token = await issueToken(service, tenantId, campaign.campaign_id);

  const input = clickInput(token, 'click-request-' + randomUUID());
  const first = await service.recordClick(input);
  assert.equal(first.status, 'qualified');
  assert.equal(first.grossAmount, '0.01');
  assert.equal(first.affiliateReward, '0.0075');
  assert.equal(first.platformCommission, '0.0025');
  assert.equal(first.currency, 'EUR');
  assert.ok(first.ledgerTransactionId);

  const replay = await service.recordClick(input);
  assert.equal(replay.replayed, true);
  assert.equal(replay.clickId, first.clickId);
  assert.equal(replay.ledgerTransactionId, first.ledgerTransactionId);

  const ledger = await service.getLedgerTransaction({
    securityContext: context(tenantId),
    transactionId: first.ledgerTransactionId
  });
  assert.equal(ledger.status, 'posted');
  assert.equal(ledger.total_debit, '0.010000');
  assert.equal(ledger.total_credit, '0.010000');
  assert.equal(ledger.entries.length, 3);
  assert.equal(
    ledger.entries.reduce((sum, entry) => sum + BigInt(Math.round(Number(entry.debit_amount) * 1_000_000)), 0n),
    10000n
  );
  assert.deepEqual(
    ledger.entries.map(entry => [entry.account_code, entry.debit_amount, entry.credit_amount]).sort(),
    [
      ['advertiser_receivable', '0.010000', '0.000000'],
      ['affiliate_payable', '0.000000', '0.007500'],
      ['platform_commission_revenue', '0.000000', '0.002500']
    ].sort()
  );

  const click = await pool.query(
    'SELECT visitor_hash,ip_hash,user_agent_hash,referrer_host,status,ledger_transaction_id FROM afx_affiliate_clicks WHERE tenant_id=$1 AND click_id=$2',
    [tenantId, first.clickId]
  );
  assert.equal(click.rows[0].status, 'qualified');
  assert.equal(click.rows[0].referrer_host, 'publisher.example');
  assert.equal(click.rows[0].visitor_hash.length, 64);
  assert.equal(click.rows[0].ip_hash.length, 64);
  assert.equal(click.rows[0].user_agent_hash.length, 64);
  assert.equal(click.rows[0].ledger_transaction_id, first.ledgerTransactionId);
  assert.equal('ip_address' in click.rows[0], false);

  const events = await pool.query(
    `SELECT event_type FROM afx_outbox_events
     WHERE tenant_id=$1 AND aggregate_id=$2
     ORDER BY created_at,event_id`,
    [tenantId, first.clickId]
  );
  assert.deepEqual(events.rows.map(row => row.event_type), [
    'affiliate.click.recorded',
    'affiliate.click.qualified'
  ]);
});

test('request id reuse with changed attribution is rejected and tenants cannot read each other ledger entries', { skip: !databaseUrl }, async () => {
  const tenantA = 'tenant-aff-a-' + randomUUID();
  const tenantB = 'tenant-aff-b-' + randomUUID();
  const service = await fixture();
  const campaignA = await campaignFor(service, tenantA);
  const tokenA = await issueToken(service, tenantA, campaignA.campaign_id);
  const input = clickInput(tokenA, 'click-request-' + randomUUID());
  const earning = await service.recordClick(input);
  const mismatch = await service.recordClick({ ...input, visitorKey: 'different-visitor' });
  assert.equal(mismatch.status, 409);
  assert.equal(mismatch.message, 'click_request_id_reused');

  assert.equal(await service.getLedgerTransaction({
    securityContext: context(tenantB),
    transactionId: earning.ledgerTransactionId
  }), null);
  assert.deepEqual(await service.listLedger({ securityContext: context(tenantB) }), []);
});

test('high-risk click is held for review and only posts after explicit approval', { skip: !databaseUrl }, async () => {
  const tenantId = 'tenant-aff-review-' + randomUUID();
  const service = await fixture({ fraudPolicy: { maxVisitorClicksPerHour: 1, maxIpClicksPerHour: 100 } });
  const campaign = await campaignFor(service, tenantId);
  const token = await issueToken(service, tenantId, campaign.campaign_id);

  const first = await service.recordClick(clickInput(token, 'first-click-' + randomUUID(), {
    visitorKey: 'same-visitor', ipAddress: '198.51.100.1'
  }));
  assert.equal(first.status, 'qualified');

  const second = await service.recordClick(clickInput(token, 'second-click-' + randomUUID(), {
    visitorKey: 'same-visitor', ipAddress: '198.51.100.2'
  }));
  assert.equal(second.status, 'pending_review');
  assert.equal(second.riskScore, 35);

  const approved = await service.reviewClick({
    securityContext: context(tenantId),
    clickId: second.clickId,
    decision: 'approve'
  });
  assert.equal(approved.status, 'qualified');
  assert.ok(approved.ledgerTransactionId);

  await assert.rejects(
    service.reviewClick({
      securityContext: context(tenantId),
      clickId: second.clickId,
      decision: 'reject'
    }),
    /click_not_pending_review/
  );
});

test('manual rejection never creates a ledger transaction', { skip: !databaseUrl }, async () => {
  const tenantId = 'tenant-aff-reject-' + randomUUID();
  const service = await fixture({ fraudPolicy: { maxVisitorClicksPerHour: 0, maxIpClicksPerHour: 100 } });
  const campaign = await campaignFor(service, tenantId);
  const token = await issueToken(service, tenantId, campaign.campaign_id);
  const click = await service.recordClick(clickInput(token, 'reject-click-' + randomUUID(), {
    visitorKey: 'visitor-reject', ipAddress: '192.0.2.8'
  }));
  assert.equal(click.status, 'pending_review');
  const rejected = await service.reviewClick({
    securityContext: context(tenantId),
    clickId: click.clickId,
    decision: 'reject'
  });
  assert.equal(rejected.status, 'rejected');
  const row = await pool.query(
    'SELECT status,ledger_transaction_id FROM afx_affiliate_clicks WHERE tenant_id=$1 AND click_id=$2',
    [tenantId, click.clickId]
  );
  assert.equal(row.rows[0].status, 'rejected');
  assert.equal(row.rows[0].ledger_transaction_id, null);
});

test('reversal posts opposite entries, marks click reversed and never edits original journal', { skip: !databaseUrl }, async () => {
  const tenantId = 'tenant-aff-reverse-' + randomUUID();
  const service = await fixture();
  const campaign = await campaignFor(service, tenantId);
  const token = await issueToken(service, tenantId, campaign.campaign_id);
  const earning = await service.recordClick(clickInput(token, 'reverse-click-' + randomUUID()));
  const original = await service.getLedgerTransaction({
    securityContext: context(tenantId),
    transactionId: earning.ledgerTransactionId
  });

  const reversal = await service.reverseLedgerTransaction({
    securityContext: context(tenantId),
    transactionId: earning.ledgerTransactionId,
    reason: 'Advertiser dispute validated'
  });
  assert.equal(reversal.replayed, false);
  const reversed = await service.getLedgerTransaction({
    securityContext: context(tenantId),
    transactionId: reversal.reversalTransactionId
  });
  assert.equal(reversed.total_debit, original.total_debit);
  assert.equal(reversed.total_credit, original.total_credit);
  assert.deepEqual(
    reversed.entries.map(row => [row.account_code, row.debit_amount, row.credit_amount]).sort(),
    original.entries.map(row => [row.account_code, row.credit_amount, row.debit_amount]).sort()
  );
  const replay = await service.reverseLedgerTransaction({
    securityContext: context(tenantId),
    transactionId: earning.ledgerTransactionId,
    reason: 'Advertiser dispute validated'
  });
  assert.equal(replay.replayed, true);
  assert.equal(replay.reversalTransactionId, reversal.reversalTransactionId);

  const click = await pool.query(
    'SELECT status,reversal_transaction_id FROM afx_affiliate_clicks WHERE tenant_id=$1 AND click_id=$2',
    [tenantId, earning.clickId]
  );
  assert.equal(click.rows[0].status, 'reversed');
  assert.equal(click.rows[0].reversal_transaction_id, reversal.reversalTransactionId);

  await assert.rejects(
    pool.query('UPDATE afx_ledger_transactions SET status=$1 WHERE transaction_id=$2', ['posted', earning.ledgerTransactionId]),
    /ledger_is_append_only/
  );
  await assert.rejects(
    pool.query('DELETE FROM afx_ledger_entries WHERE transaction_id=$1', [earning.ledgerTransactionId]),
    /ledger_is_append_only/
  );
});

test('a deferred database constraint blocks an unbalanced journal at commit', { skip: !databaseUrl }, async () => {
  const tenantId = 'tenant-aff-unbalanced-' + randomUUID();
  const service = await fixture();
  const campaign = await campaignFor(service, tenantId);
  const token = await issueToken(service, tenantId, campaign.campaign_id);
  const earning = await service.recordClick(clickInput(token, 'balance-click-' + randomUUID()));
  const journal = await service.getLedgerTransaction({
    securityContext: context(tenantId),
    transactionId: earning.ledgerTransactionId
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txId = randomUUID();
    await client.query(
      `INSERT INTO afx_ledger_transactions
        (transaction_id,tenant_id,source_type,source_id,posting_type,currency,total_debit,total_credit,status,created_by)
       VALUES ($1,$2,'test.unbalanced',$3,'TEST','EUR',1,1,'posted','test')`,
      [txId, tenantId, randomUUID()]
    );
    const receivable = journal.entries.find(row => row.account_code === 'advertiser_receivable');
    const payable = journal.entries.find(row => row.account_code === 'affiliate_payable');
    await client.query(
      `INSERT INTO afx_ledger_entries
        (entry_id,tenant_id,transaction_id,account_id,currency,debit_amount,credit_amount,description)
       VALUES
        ($1,$2,$3,$4,'EUR',1,0,'unbalanced debit'),
        ($5,$2,$3,$6,'EUR',0,0.5,'unbalanced credit')`,
      [randomUUID(),tenantId,txId,receivable.account_id,randomUUID(),payable.account_id]
    );
    await assert.rejects(client.query('COMMIT'), /ledger_transaction_unbalanced/);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
  }
});

test('campaign creation and its outbox event roll back together', { skip: !databaseUrl }, async () => {
  const tenantId = 'tenant-aff-rollback-' + randomUUID();
  const failedOutbox = {
    async append(client, event) {
      await createPostgresOutboxStore(pool).append(client, event);
      throw new Error('simulated_outbox_append_failure');
    }
  };
  const service = await fixture({ outbox: failedOutbox });
  await assert.rejects(
    campaignFor(service, tenantId),
    /simulated_outbox_append_failure/
  );
  const rows = await pool.query('SELECT campaign_id FROM afx_affiliate_campaigns WHERE tenant_id=$1', [tenantId]);
  assert.equal(rows.rowCount, 0);
});
