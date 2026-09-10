import test from 'node:test';
import assert from 'node:assert/strict';
import { MfaService } from '../src/mfa-service.js';

test('MFA audit events never contain TOTP secrets or recovery codes', () => {
  const events = [];
  const service = new MfaService({ audit: event => events.push(event) });
  const pending = service.beginEnrollment('audit-user');
  assert.throws(() => service.confirmEnrollment({ enrollmentId: pending.enrollmentId, code: '000000', nowMs: 1_700_000_000_000 }), /invalid_mfa_code/);
  const serialized = JSON.stringify(events);
  assert.equal(serialized.includes(pending.secret), false);
  assert.equal(serialized.includes('000000'), false);
});
