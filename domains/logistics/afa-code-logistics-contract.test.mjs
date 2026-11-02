import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLogisticUnitId,
  validateSscc,
  validateTraceabilityEvent
} from './afa-code-logistics-contract.mjs';

test('accepts correctly formatted logistic-unit public IDs only', () => {
  assert.equal(validateLogisticUnitId('AFA-LU-0123456789abcdef').valid, true);
  assert.equal(validateLogisticUnitId('AFA-PRD-0123456789abcdef').valid, false);
});

test('validates SSCC check digit without claiming allocation ownership', () => {
  const valid = validateSscc('003123456789012337');
  assert.equal(valid.valid, true);
  assert.equal(valid.ownershipVerified, false);
  assert.equal(validateSscc('003123456789012338').code, 'invalid_sscc_check_digit');
  assert.equal(validateSscc('123').code, 'invalid_sscc_format');
});

test('accepts traceability event with separate event and recorded timestamps', () => {
  assert.deepEqual(validateTraceabilityEvent({
    eventId: 'AFA-EVT-0123456789abcdef',
    eventType: 'shipping',
    subjectId: 'AFA-SHP-0123456789abcdef',
    occurredAt: '2026-11-03T10:00:00.000Z',
    recordedAt: '2026-11-03T10:01:00.000Z'
  }), { valid: true });
});

test('requires correction target to preserve event history', () => {
  assert.deepEqual(validateTraceabilityEvent({
    eventId: 'AFA-EVT-0123456789abcdef',
    eventType: 'correction',
    subjectId: 'AFA-SHP-0123456789abcdef',
    occurredAt: '2026-11-03T10:00:00.000Z',
    recordedAt: '2026-11-03T10:01:00.000Z'
  }), { valid: false, code: 'correction_target_required' });
});

test('rejects invalid event timestamps and event types', () => {
  assert.equal(validateTraceabilityEvent({ eventType: 'unknown' }).code, 'invalid_event_type');
  assert.equal(validateTraceabilityEvent({
    eventId: 'e1',
    eventType: 'shipping',
    subjectId: 's1',
    occurredAt: 'not-a-time',
    recordedAt: '2026-11-03T10:01:00.000Z'
  }).code, 'invalid_event_time');
});
