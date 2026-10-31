import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { affiliateFinanceInternals, createAffiliateFinanceService } from './affiliate-finance.mjs';

test('decimal conversion is exact at six fractional digits', () => {
  const { decimalToMicros, microsToDecimal } = affiliateFinanceInternals;
  assert.equal(decimalToMicros('0.000001'), 1n);
  assert.equal(decimalToMicros('123456.123456'), 123456123456n);
  assert.equal(microsToDecimal(1n), '0.000001');
  assert.equal(microsToDecimal(123456123456n), '123456.123456');
  assert.equal(microsToDecimal(1000000n), '1');
});

test('decimal parser rejects floating point, exponent and over-precision inputs', () => {
  const { decimalToMicros } = affiliateFinanceInternals;
  for (const value of [0.01, '1e-3', '1.0000001', '-1', '01.00', 'NaN', '']) {
    assert.throws(() => decimalToMicros(value), /invalid_decimal/);
  }
});

test('signed click token verification is tamper resistant and enforces expiry', () => {
  const secret = 'a'.repeat(32);
  const payload = {
    tenantId: 'tenant-a',
    campaignId: 'campaign-a',
    affiliateId: 'affiliate-a',
    exp: 2_000_000_000
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  const token = encoded + '.' + signature;
  assert.deepEqual(
    affiliateFinanceInternals.verifyClickToken(token, secret, 1_900_000_000_000),
    payload
  );
  assert.throws(
    () => affiliateFinanceInternals.verifyClickToken(encoded + '.' + 'A'.repeat(43), secret, 1),
    /invalid_click_signature/
  );
  assert.throws(
    () => affiliateFinanceInternals.verifyClickToken(token, secret, 2_000_000_000_000),
    /click_token_expired/
  );
});

test('service refuses missing PostgreSQL, outbox and weak production secrets', () => {
  assert.throws(() => createAffiliateFinanceService({}), /postgres_pool_required/);
  const pool = { connect() {} };
  assert.throws(() => createAffiliateFinanceService({ pool }), /transactional_outbox_required/);
  assert.throws(
    () => createAffiliateFinanceService({ pool, outbox: { append() {} }, signingSecret: 'weak', privacyHashSecret: 'a'.repeat(32) }),
    /affiliate_signing_secret_min_32_bytes_required/
  );
  assert.throws(
    () => createAffiliateFinanceService({ pool, outbox: { append() {} }, signingSecret: 'a'.repeat(32), privacyHashSecret: 'weak' }),
    /privacy_hash_secret_min_32_bytes_required/
  );
});
