import test from 'node:test';
import assert from 'node:assert/strict';
import { errorResponse, okResponse } from './response-contract.js';

test('builds an immutable success envelope', () => {
  const response = okResponse({ status: 201, requestId: 'req-1', data: { id: 'x' }, meta: { version: 'v1' } });
  assert.deepEqual(response, {
    ok: true,
    status: 201,
    requestId: 'req-1',
    data: { id: 'x' },
    meta: { version: 'v1' },
  });
  assert.throws(() => { response.status = 500; }, TypeError);
});

test('builds a bounded error envelope with retry semantics', () => {
  const response = errorResponse({
    status: 429,
    code: 'rate_limited',
    message: 'Too many requests',
    requestId: 'req-2',
    retryable: true,
  });
  assert.deepEqual(response, {
    ok: false,
    status: 429,
    requestId: 'req-2',
    error: {
      code: 'rate_limited',
      message: 'Too many requests',
      details: undefined,
      retryable: true,
    },
  });
});

test('rejects malformed status, code and message values', () => {
  assert.throws(() => okResponse({ status: 500 }), /invalid_success_status/);
  assert.throws(() => errorResponse({ status: 200, code: 'bad', message: 'x' }), /invalid_error_status/);
  assert.throws(() => errorResponse({ status: 400, code: 'Bad Code', message: 'x' }), /invalid_error_code/);
  assert.throws(() => errorResponse({ status: 400, code: 'bad', message: '' }), /invalid_error_message/);
  assert.throws(() => errorResponse({ status: 400, code: 'bad', message: 'x'.repeat(513) }), /invalid_error_message/);
});
