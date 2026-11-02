const PUBLIC_ID_TYPES = new Set(['ORG', 'FAC', 'BRD', 'PRD', 'VAR', 'TI', 'LOT', 'UNT', 'LU', 'SHP', 'EVT', 'LOC', 'DOC', 'VER']);
const PUBLIC_ID_PATTERN = /^AFA-([A-Z]{2,3})-([A-Za-z0-9_-]{16,64})$/;
const GTIN_LENGTHS = new Set([8, 12, 13, 14]);
const VERIFICATION_TRANSITIONS = Object.freeze({
  draft: new Set(['submitted']),
  submitted: new Set(['under_review', 'needs_information', 'rejected']),
  under_review: new Set(['approved', 'rejected', 'needs_information']),
  needs_information: new Set(['submitted']),
  approved: new Set(['suspended', 'revoked']),
  suspended: new Set(['approved', 'revoked']),
  rejected: new Set([]),
  revoked: new Set([])
});

export function validatePublicId(value, expectedType) {
  if (typeof value !== 'string') return { valid: false, code: 'invalid_public_id' };
  const match = PUBLIC_ID_PATTERN.exec(value);
  if (!match || !PUBLIC_ID_TYPES.has(match[1])) return { valid: false, code: 'invalid_public_id' };
  if (expectedType && match[1] !== expectedType) return { valid: false, code: 'identifier_type_mismatch' };
  return { valid: true, type: match[1], value };
}

export function validateGtin(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value) || !GTIN_LENGTHS.has(value.length)) {
    return { valid: false, code: 'invalid_gtin_format' };
  }
  const digits = [...value].map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  let weight = 3;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    sum += digits[i] * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const expected = (10 - (sum % 10)) % 10;
  if (checkDigit !== expected) return { valid: false, code: 'invalid_gtin_check_digit' };
  return { valid: true, scheme: 'GTIN', normalizedValue: value, ownershipVerified: false };
}

export function validateSscc(value) {
  if (typeof value !== 'string' || !/^\d{18}$/.test(value)) {
    return { valid: false, code: 'invalid_sscc_format' };
  }
  const digits = [...value].map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  let weight = 3;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    sum += digits[i] * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const expected = (10 - (sum % 10)) % 10;
  if (checkDigit !== expected) return { valid: false, code: 'invalid_sscc_check_digit' };
  return { valid: true, scheme: 'SSCC', normalizedValue: value, ownershipVerified: false };
}

export function canTransitionVerification(from, to) {
  return typeof from === 'string'
    && typeof to === 'string'
    && Boolean(VERIFICATION_TRANSITIONS[from]?.has(to));
}

export function validateExternalIdentifierAssociation({ scheme, value, entityType, entityId } = {}) {
  if (typeof scheme !== 'string' || !/^[A-Z][A-Z0-9_-]{1,31}$/.test(scheme)) {
    return { valid: false, code: 'invalid_identifier_scheme' };
  }
  if (typeof value !== 'string' || value.length < 1 || value.length > 128 || value.trim() !== value) {
    return { valid: false, code: 'invalid_identifier_value' };
  }
  if (typeof entityType !== 'string' || !PUBLIC_ID_TYPES.has(entityType)) {
    return { valid: false, code: 'invalid_entity_type' };
  }
  const id = validatePublicId(entityId, entityType);
  if (!id.valid) return { valid: false, code: id.code };
  if (scheme === 'GTIN') {
    const gtin = validateGtin(value);
    if (!gtin.valid) return gtin;
  }
  if (scheme === 'SSCC') {
    const sscc = validateSscc(value);
    if (!sscc.valid) return sscc;
    if (entityType !== 'LU') return { valid: false, code: 'sscc_must_identify_logistic_unit' };
  }
  return {
    valid: true,
    scheme,
    value,
    entityType,
    entityId,
    verificationRequired: true
  };
}
