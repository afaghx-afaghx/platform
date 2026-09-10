import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRequest } from './request-contract.js';

test('normalizes a valid versioned request without creating auth authority', () => {
  const result = normalizeRequest({
    method: 'get',
    path: '/v1/health',
    apiVersion: 'v1',
    requestId: 'req-123',
    tenantId: 'tenant-a',
    organizationId: 'org-a',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.request, {
    method: 'GET',
    path: '/v1/health',
    apiVersion: 'v1',
    requestId: 'req-123',
    tenantId: 'tenant-a',
    organizationId: 'org-a',
  });
});

test('rejects unsupported methods', () => {
  assert.deepEqual(normalizeRequest({ method: 'TRACE', path: '/x', apiVersion: 'v1' }), {
    ok: false,
    status: 400,
    code: 'unsupported_method',
  });
});

test('rejects invalid paths and API versions', () => {
  assert.equal(normalizeRequest({ method: 'GET', path: 'v1/x', apiVersion: 'v1' }).code, 'invalid_path');
  assert.equal(normalizeRequest({ method: 'GET', path: '/x', apiVersion: '1' }).code, 'invalid_api_version');
});

test('rejects oversized request ids', () => {
  assert.equal(
    normalizeRequest({ method: 'GET', path: '/x', apiVersion: 'v1', requestId: 'x'.repeat(129) }).code,
    'request_id_too_long',
  );
});
