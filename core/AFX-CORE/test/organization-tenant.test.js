import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';

function setup() {
  const events = [];
  const core = new AfxCore({ audit: event => events.push(event) });
  const organization = core.createOrganization({ name: 'Acme Corporation', slug: 'Acme-Corporation' });
  const tenant = core.createTenant({ organizationId: organization.id, name: 'Production', slug: 'Production' });
  const user = core.createUser({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: tenant.id, roles: ['admin'] });
  core.grantRolePermission('admin', 'invoice.read');
  return { core, organization, tenant, user, events };
}

test('organization and tenant identifiers are stable and slugs are normalized', () => {
  const { organization, tenant } = setup();
  assert.match(organization.id, /^org_/);
  assert.equal(organization.slug, 'acme-corporation');
  assert.match(tenant.id, /^ten_/);
  assert.equal(tenant.slug, 'production');
  assert.equal(tenant.organizationId, organization.id);
});

test('tenant cannot be created outside an active organization', () => {
  const core = new AfxCore();
  assert.throws(() => core.createTenant({ organizationId: 'missing', name: 'Production', slug: 'production' }), /organization_not_found/);
  const organization = core.createOrganization({ name: 'Acme', slug: 'acme' });
  core.changeOrganizationStatus({ organizationId: organization.id, status: 'suspended' });
  assert.throws(() => core.createTenant({ organizationId: organization.id, name: 'Production', slug: 'production' }), /organization_inactive/);
});

test('duplicate organization and tenant slugs are rejected within their authority', () => {
  const core = new AfxCore();
  const organization = core.createOrganization({ name: 'Acme', slug: 'acme' });
  assert.throws(() => core.createOrganization({ name: 'Another Acme', slug: 'ACME' }), /organization_exists/);
  core.createTenant({ organizationId: organization.id, name: 'Production', slug: 'production' });
  assert.throws(() => core.createTenant({ organizationId: organization.id, name: 'Production 2', slug: 'Production' }), /tenant_exists/);
});

test('tenant suspension immediately revokes active sessions and blocks authorization', () => {
  const { core, tenant, user } = setup();
  const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  const context = core.authenticateAccessToken(tokens.accessToken);
  assert.equal(context.organizationId, tenant.organizationId);
  assert.equal(core.authorize(context, 'invoice.read', tenant.id), true);
  core.changeTenantStatus({ tenantId: tenant.id, status: 'suspended' });
  assert.throws(() => core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
  assert.equal(core.authorize(context, 'invoice.read', tenant.id), false);
});

test('organization suspension propagates to active tenants and blocks tenant access', () => {
  const { core, organization, tenant, user } = setup();
  const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  core.changeOrganizationStatus({ organizationId: organization.id, status: 'suspended' });
  assert.equal(core.getTenant(tenant.id).status, 'suspended');
  assert.throws(() => core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
  assert.throws(() => core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: tenant.id }), /tenant_access_denied/);
});

test('organization and tenant deletion are terminal lifecycle states', () => {
  const { core, organization, tenant } = setup();
  core.changeOrganizationStatus({ organizationId: organization.id, status: 'deleted' });
  assert.equal(core.getOrganization(organization.id).status, 'deleted');
  assert.equal(core.getTenant(tenant.id).status, 'deleted');
  assert.throws(() => core.changeOrganizationStatus({ organizationId: organization.id, status: 'active' }), /invalid_organization_transition/);
  assert.throws(() => core.changeTenantStatus({ tenantId: tenant.id, status: 'active' }), /invalid_tenant_transition/);
});

test('membership cannot be created for a missing or inactive tenant', () => {
  const core = new AfxCore();
  const user = core.createUser({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!' });
  assert.throws(() => core.addMembership({ userId: user.id, tenantId: 'missing', roles: [] }), /tenant_not_found/);
  const organization = core.createOrganization({ name: 'Acme', slug: 'acme' });
  const tenant = core.createTenant({ organizationId: organization.id, name: 'Production', slug: 'production' });
  core.changeTenantStatus({ tenantId: tenant.id, status: 'suspended' });
  assert.throws(() => core.addMembership({ userId: user.id, tenantId: tenant.id, roles: [] }), /tenant_inactive/);
});
