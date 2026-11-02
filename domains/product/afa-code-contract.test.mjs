import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionVerification,
  validateExternalIdentifierAssociation,
  validateGtin,
  validatePublicId,
  validateSscc
} from './afa-code-contract.mjs';

const productId = 'AFA-PRD-0123456789abcdef';
const logisticUnitId = 'AFA-LU-0123456789abcdef';

test('accepts an opaque public ID with matching entity type', () => {
  assert.equal(validatePublicId(productId, 'PRD').valid, true);
  assert.deepEqual(validatePublicId(productId, 'FAC'), {
    valid: false,
    code: 'identifier_type_mismatch'
  });
});

test('rejects malformed or unknown public ID types', () => {
  assert.equal(validatePublicId('AFA-PRD-123', 'PRD').valid, false);
  assert.equal(validatePublicId('AFA-XYZ-0123456789abcdef', 'XYZ').valid, false);
  assert.equal(validatePublicId(null, 'PRD').valid, false);
});

test('validates GTIN check digit but does not claim ownership verification', () => {
  assert.equal(validateGtin('4006381333931').valid, true);
  assert.deepEqual(validateGtin('4006381333932'), {
    valid: false,
    code: 'invalid_gtin_check_digit'
  });
  assert.equal(validateGtin('123').code, 'invalid_gtin_format');
});

test('validates SSCC shape and check digit', () => {
  assert.equal(validateSscc('003123456789012331').valid, true);
  assert.equal(validateSscc('003123456789012332').code, 'invalid_sscc_check_digit');
  assert.equal(validateSscc('123').code, 'invalid_sscc_format');
});

test('does not allow SSCC to identify a product instead of a logistic unit', () => {
  const result = validateExternalIdentifierAssociation({
    scheme: 'SSCC',
    value: '003123456789012331',
    entityType: 'PRD',
    entityId: productId
  });
  assert.deepEqual(result, {
    valid: false,
    code: 'sscc_must_identify_logistic_unit'
  });
});

test('external identifiers require a valid entity association and later verification', () => {
  const result = validateExternalIdentifierAssociation({
    scheme: 'GTIN',
    value: '4006381333931',
    entityType: 'PRD',
    entityId: productId
  });
  assert.equal(result.valid, true);
  assert.equal(result.verificationRequired, true);
});

test('verification state machine blocks invalid transitions', () => {
  assert.equal(canTransitionVerification('draft', 'submitted'), true);
  assert.equal(canTransitionVerification('submitted', 'approved'), false);
  assert.equal(canTransitionVerification('under_review', 'approved'), true);
  assert.equal(canTransitionVerification('revoked', 'approved'), false);
});
