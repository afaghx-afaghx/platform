const PUBLIC_ID_PATTERN = /^AFA-([A-Z]{2,3})-([A-Za-z0-9_-]{16,64})$/;

export function validateLogisticUnitId(value) {
  const match = typeof value === 'string' ? PUBLIC_ID_PATTERN.exec(value) : null;
  return match && match[1] === 'LU'
    ? { valid: true, value }
    : { valid: false, code: 'invalid_logistic_unit_id' };
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

export function validateTraceabilityEvent(event = {}) {
  const allowedTypes = new Set([
    'commissioning', 'packing', 'shipping', 'handover', 'arrival',
    'customs_release', 'delivery', 'exception', 'correction', 'void'
  ]);
  if (!allowedTypes.has(event.eventType)) return { valid: false, code: 'invalid_event_type' };
  if (typeof event.eventId !== 'string' || !event.eventId.trim()) return { valid: false, code: 'event_id_required' };
  if (typeof event.subjectId !== 'string' || !event.subjectId.trim()) return { valid: false, code: 'event_subject_required' };
  if (typeof event.occurredAt !== 'string' || Number.isNaN(Date.parse(event.occurredAt))) {
    return { valid: false, code: 'invalid_event_time' };
  }
  if (typeof event.recordedAt !== 'string' || Number.isNaN(Date.parse(event.recordedAt))) {
    return { valid: false, code: 'invalid_recorded_time' };
  }
  if (Date.parse(event.recordedAt) < Date.parse(event.occurredAt) && event.allowLateArrival !== true) {
    return { valid: false, code: 'recorded_before_event_time' };
  }
  if (event.eventType === 'correction' || event.eventType === 'void') {
    if (typeof event.correctsEventId !== 'string' || !event.correctsEventId.trim()) {
      return { valid: false, code: 'correction_target_required' };
    }
  }
  return { valid: true };
}
