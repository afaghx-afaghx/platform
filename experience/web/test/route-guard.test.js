import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRouteAccess } from '../public/route-guard.js';

test('no context is unauthenticated', () => {
  assert.deepEqual(evaluateRouteAccess(), { state: 'unauthenticated', allowed: false });
});

test('401 requires authentication', () => {
  assert.deepEqual(evaluateRouteAccess({ error: { status: 401 } }), { state: 'authentication_required', allowed: false });
});

test('403 is authenticated but forbidden', () => {
  assert.deepEqual(evaluateRouteAccess({ error: { status: 403 } }), { state: 'forbidden', allowed: false });
});

test('valid context permits an unscoped route', () => {
  assert.deepEqual(evaluateRouteAccess({ context: { memberships: [] } }), { state: 'authorized', allowed: true });
});

test('valid context permits a role-scoped route only when the Core context contains that role', () => {
  const context = { memberships: [{ organizationId: 'org-1', roles: ['supplier'] }] };
  assert.deepEqual(evaluateRouteAccess({ context, requiredRole: 'supplier' }), { state: 'authorized', allowed: true });
  assert.deepEqual(evaluateRouteAccess({ context, requiredRole: 'factory' }), { state: 'forbidden', allowed: false });
});
