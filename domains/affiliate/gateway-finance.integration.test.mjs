import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createCanonicalRuntime } from '../../platform/Gateway/runtime.mjs';
import { createAffiliateFinanceService, ensureAffiliateFinanceSchema } from './affiliate-finance.mjs';
import { createPostgresOutboxStore, ensureOutboxSchema } from '../runtime/outbox.mjs';

const require = createRequire(new URL('../../core/AFX-CORE/package.json', import.meta.url));
const { Pool } = require('pg');
const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, max: 12 }) : null;
after(async () => { await pool?.end(); });

const signingSecret = 'gateway-affiliate-test-signing-secret-'.padEnd(48, 's');
const privacyHashSecret = 'gateway-affiliate-test-privacy-secret-'.padEnd(48, 'p');

async function request(base, path, {
  method = 'GET',
  body,
  token,
  headers = {}
} = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(new URL(path, base), {
      method,
      headers: {
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
        ...(token ? { authorization: 'Bearer ' + token } : {}),
        ...headers
      }
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
      }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('Gateway exposes tenant-scoped affiliate campaign, click, review and finance ledger APIs', { skip: !databaseUrl }, async () => {
  await ensureOutboxSchema(pool);
  await ensureAffiliateFinanceSchema(pool);

  const tenantId = 'tenant-gateway-affiliate-' + randomUUID();
  const tokenPrincipals = {
    'manager-token': {
      userId: 'affiliate-manager',
      tenantId,
      roles: ['agent-admin', 'affiliate-manager']
    },
    'viewer-token': {
      userId: 'finance-viewer',
      tenantId,
      roles: ['finance-viewer']
    },
    'other-tenant-token': {
      userId: 'other-tenant-user',
      tenantId: 'tenant-other-' + randomUUID(),
      roles: ['finance-viewer']
    }
  };
  const permissions = {
    'affiliate-manager': new Set([
      'domain:marketing:write',
      'finance:affiliate:review',
      'finance:ledger:read',
      'finance:ledger:reverse'
    ]),
    'finance-viewer': new Set(['finance:ledger:read']),
    'other-tenant-user': new Set(['finance:ledger:read'])
  };
  const fakeCore = {
    async authenticateAccessToken(token) {
      const principal = tokenPrincipals[token];
      if (!principal) throw new Error('invalid_token');
      return principal;
    },
    async authorize(principal, permission, resourceTenantId) {
      if (principal.tenantId !== resourceTenantId) return false;
      return permissions[principal.userId]?.has(permission) || false;
    }
  };
  const financeService = createAffiliateFinanceService({
    pool,
    outbox: createPostgresOutboxStore(pool),
    signingSecret,
    privacyHashSecret
  });
  const runtime = createCanonicalRuntime({
    pool,
    core: fakeCore,
    affiliateFinanceService: financeService,
    allowedOrigins: [],
    rateLimiter: {
      async consume() { return { allowed: true, remaining: 999, retryAfterMs: 0 }; }
    }
  });
  const server = runtime.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const base = 'http://127.0.0.1:' + server.address().port;

  try {
    const forbidden = await request(base, '/v1/affiliate/campaigns', {
      method: 'POST',
      token: 'viewer-token',
      body: {
        name: 'Should not create',
        currency: 'EUR',
        cpcAmount: '0.01',
        affiliateReward: '0.007',
        budgetTotal: '1.00'
      }
    });
    assert.equal(forbidden.status, 403);

    const createdCampaign = await request(base, '/v1/affiliate/campaigns', {
      method: 'POST',
      token: 'manager-token',
      body: {
        name: 'Gateway CPC campaign',
        currency: 'EUR',
        cpcAmount: '0.01',
        affiliateReward: '0.0075',
        budgetTotal: '10.00'
      }
    });
    assert.equal(createdCampaign.status, 201);
    assert.equal(createdCampaign.body.tenant_id, tenantId);
    assert.equal(createdCampaign.body.advertiser_id, 'affiliate-manager');

    const issued = await request(
      base,
      '/v1/affiliate/campaigns/' + createdCampaign.body.campaign_id + '/click-token',
      {
        method: 'POST',
        token: 'manager-token',
        body: { affiliateId: 'affiliate-manager' }
      }
    );
    assert.equal(issued.status, 201);
    assert.equal(typeof issued.body.token, 'string');

    const clickRequestId = 'gateway-click-' + randomUUID();
    const tracked = await request(base, '/v1/affiliate/clicks', {
      method: 'POST',
      headers: { 'idempotency-key': clickRequestId, 'user-agent': 'Gateway Affiliate API test', referer: 'https://publisher.example/path' },
      body: {
        token: issued.body.token,
        visitorKey: 'visitor-gateway-001'
      }
    });
    assert.equal(tracked.status, 201);
    assert.equal(tracked.body.status, 'qualified');
    assert.equal(tracked.body.affiliateReward, '0.0075');
    assert.ok(tracked.body.ledgerTransactionId);

    const ledger = await request(
      base,
      '/v1/finance/ledger/' + tracked.body.ledgerTransactionId,
      { token: 'manager-token' }
    );
    assert.equal(ledger.status, 200);
    assert.equal(ledger.body.total_debit, '0.010000');
    assert.equal(ledger.body.total_credit, '0.010000');
    assert.equal(ledger.body.entries.length, 3);

    const list = await request(base, '/v1/finance/ledger?limit=10', { token: 'viewer-token' });
    assert.equal(list.status, 200);
    assert.equal(list.body.items.some(row => row.transaction_id === tracked.body.ledgerTransactionId), true);

    const deniedViewerReverse = await request(
      base,
      '/v1/finance/ledger/' + tracked.body.ledgerTransactionId + '/reverse',
      { method: 'POST', token: 'viewer-token', body: { reason: 'Not authorized' } }
    );
    assert.equal(deniedViewerReverse.status, 403);

    const reversal = await request(
      base,
      '/v1/finance/ledger/' + tracked.body.ledgerTransactionId + '/reverse',
      { method: 'POST', token: 'manager-token', body: { reason: 'Gateway integration reversal' } }
    );
    assert.equal(reversal.status, 201);
    assert.equal(reversal.body.originalTransactionId, tracked.body.ledgerTransactionId);

    const replay = await request(base, '/v1/affiliate/clicks', {
      method: 'POST',
      headers: { 'idempotency-key': clickRequestId, 'user-agent': 'Gateway Affiliate API test', referer: 'https://publisher.example/path' },
      body: {
        token: issued.body.token,
        visitorKey: 'visitor-gateway-001'
      }
    });
    assert.equal(replay.status, 201);
    assert.equal(replay.body.replayed, true);
    assert.equal(replay.body.ledgerTransactionId, tracked.body.ledgerTransactionId);

    const otherTenantRead = await request(
      base,
      '/v1/finance/ledger/' + tracked.body.ledgerTransactionId,
      { token: 'other-tenant-token' }
    );
    assert.equal(otherTenantRead.status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
    runtime.close();
  }
});
