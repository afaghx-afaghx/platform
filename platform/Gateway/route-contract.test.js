import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouteRegistry, defineRoute } from './route-contract.js';

test('defines immutable versioned route metadata', () => {
  const route = defineRoute({
    id: 'HEALTH-V1',
    method: 'get',
    path: '/v1/health',
    apiVersion: 'v1',
    auth: 'none',
    tenantContext: 'none',
  });

  assert.deepEqual(route, {
    id: 'HEALTH-V1',
    method: 'GET',
    path: '/v1/health',
    apiVersion: 'v1',
    auth: 'none',
    permission: undefined,
    tenantContext: 'none',
  });
  assert.throws(() => { route.id = 'MUTATED'; }, TypeError);
});

test('requires explicit security metadata for protected routes', () => {
  const route = defineRoute({
    id: 'ORDERS-READ-V1',
    method: 'GET',
    path: '/v1/orders',
    permission: 'orders.read',
  });
  assert.equal(route.auth, 'required');
  assert.equal(route.tenantContext, 'required');
  assert.equal(route.permission, 'orders.read');
});

test('rejects authorization metadata without authentication', () => {
  assert.throws(
    () => defineRoute({ id: 'BAD-V1', method: 'GET', path: '/v1/bad', auth: 'none', permission: 'x.read' }),
    /permission_requires_auth/,
  );
});

test('rejects duplicate route ids and route signatures', () => {
  const first = defineRoute({ id: 'A-V1', method: 'GET', path: '/v1/a' });
  assert.throws(() => createRouteRegistry([first, { ...first }]), /duplicate_route_id/);

  const second = defineRoute({ id: 'B-V1', method: 'GET', path: '/v1/a' });
  assert.throws(() => createRouteRegistry([first, second]), /duplicate_route_signature/);
});

test('lists a stable route registry without exposing mutation', () => {
  const registry = createRouteRegistry([
    defineRoute({ id: 'A-V1', method: 'GET', path: '/v1/a', tenantContext: 'required' }),
    defineRoute({ id: 'B-V1', method: 'POST', path: '/v1/b', permission: 'b.write' }),
  ]);

  assert.equal(registry.size, 2);
  assert.equal(registry.get('A-V1').path, '/v1/a');
  assert.deepEqual(registry.list().map(route => route.id), ['A-V1', 'B-V1']);
  assert.throws(() => { registry.list().push('bad'); }, TypeError);
});
