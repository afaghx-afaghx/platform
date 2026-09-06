import { normalizeEmail, hashPassword, verifyPassword, randomToken, tokenDigest, SECURITY_PARAMETERS } from './security.js';

export const IDENTITY_STATUSES = Object.freeze(['active', 'disabled', 'locked', 'deleted']);
export const ORGANIZATION_STATUSES = Object.freeze(['active', 'suspended', 'deleted']);
export const TENANT_STATUSES = Object.freeze(['active', 'suspended', 'deleted']);

const IDENTITY_TRANSITIONS = Object.freeze({
  active: new Set(['disabled', 'locked', 'deleted']),
  disabled: new Set(['active', 'deleted']),
  locked: new Set(['active', 'disabled', 'deleted']),
  deleted: new Set(),
});

const ORGANIZATION_TRANSITIONS = Object.freeze({
  active: new Set(['suspended', 'deleted']),
  suspended: new Set(['active', 'deleted']),
  deleted: new Set(),
});

const TENANT_TRANSITIONS = Object.freeze({
  active: new Set(['suspended', 'deleted']),
  suspended: new Set(['active', 'deleted']),
  deleted: new Set(),
});

function assertLifecycleTransition(current, next, statuses, transitions, errorPrefix) {
  if (!statuses.includes(next) || !statuses.includes(current)) throw new Error(`invalid_${errorPrefix}_status`);
  if (current === next) return;
  if (!transitions[current]?.has(next)) throw new Error(`invalid_${errorPrefix}_transition`);
}

export function assertIdentityTransition(current, next) {
  assertLifecycleTransition(current, next, IDENTITY_STATUSES, IDENTITY_TRANSITIONS, 'identity');
}

export function assertOrganizationTransition(current, next) {
  assertLifecycleTransition(current, next, ORGANIZATION_STATUSES, ORGANIZATION_TRANSITIONS, 'organization');
}

export function assertTenantTransition(current, next) {
  assertLifecycleTransition(current, next, TENANT_STATUSES, TENANT_TRANSITIONS, 'tenant');
}

function normalizeSlug(value) {
  if (typeof value !== 'string') throw new Error('invalid_slug');
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2 || slug.length > 80) throw new Error('invalid_slug');
  return slug;
}

function validateName(value) {
  if (typeof value !== 'string') throw new Error('invalid_name');
  const name = value.trim();
  if (name.length < 2 || name.length > 200) throw new Error('invalid_name');
  return name;
}

export class AfxCore {
  constructor({ clock = () => Date.now(), audit = () => {} } = {}) {
    this.clock = clock;
    this.audit = audit;
    this.users = new Map();
    this.organizations = new Map();
    this.tenants = new Map();
    this.memberships = new Map();
    this.permissions = new Map();
    this.sessions = new Map();
    this.refreshFamilies = new Map();
    this.refreshTokens = new Map();
  }

  createOrganization({ name, slug }) {
    const normalizedSlug = normalizeSlug(slug);
    if ([...this.organizations.values()].some(org => org.slug === normalizedSlug)) throw new Error('organization_exists');
    const organization = { id: `org_${randomToken()}`, slug: normalizedSlug, name: validateName(name), status: 'active' };
    this.organizations.set(organization.id, organization);
    this.audit({ type: 'organization.created', organizationId: organization.id });
    return { ...organization };
  }

  getOrganization(organizationId) {
    const organization = this.organizations.get(organizationId);
    if (!organization) throw new Error('organization_not_found');
    return { ...organization };
  }

  changeOrganizationStatus({ organizationId, status }) {
    const organization = this.organizations.get(organizationId);
    if (!organization) throw new Error('organization_not_found');
    assertOrganizationTransition(organization.status, status);
    if (organization.status === status) return { ...organization };
    const previousStatus = organization.status;
    organization.status = status;
    if (status !== 'active') {
      for (const tenant of this.tenants.values()) {
        if (tenant.organizationId === organizationId && tenant.status === 'active') this.changeTenantStatus({ tenantId: tenant.id, status });
      }
    }
    this.audit({ type: 'organization.status_changed', organizationId, previousStatus, status });
    return { ...organization };
  }

  createTenant({ organizationId, name, slug }) {
    const organization = this.organizations.get(organizationId);
    if (!organization) throw new Error('organization_not_found');
    if (organization.status !== 'active') throw new Error('organization_inactive');
    const normalizedSlug = normalizeSlug(slug);
    if ([...this.tenants.values()].some(tenant => tenant.organizationId === organizationId && tenant.slug === normalizedSlug)) throw new Error('tenant_exists');
    const tenant = { id: `ten_${randomToken()}`, organizationId, slug: normalizedSlug, name: validateName(name), status: 'active' };
    this.tenants.set(tenant.id, tenant);
    this.audit({ type: 'tenant.created', tenantId: tenant.id, organizationId });
    return { ...tenant };
  }

  getTenant(tenantId) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error('tenant_not_found');
    return { ...tenant };
  }

  changeTenantStatus({ tenantId, status }) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error('tenant_not_found');
    assertTenantTransition(tenant.status, status);
    if (tenant.status === status) return { ...tenant };
    const previousStatus = tenant.status;
    tenant.status = status;
    if (status !== 'active') {
      for (const session of this.sessions.values()) {
        if (session.tenantId !== tenantId) continue;
        session.revoked = true;
        const family = this.refreshFamilies.get(session.familyId);
        if (family) family.revoked = true;
      }
    }
    this.audit({ type: 'tenant.status_changed', tenantId, organizationId: tenant.organizationId, previousStatus, status });
    return { ...tenant };
  }

  createUser({ email, password }) {
    const normalized = normalizeEmail(email);
    if (this.users.has(normalized)) throw new Error('user_exists');
    const user = { id: `usr_${randomToken()}`, email: normalized, passwordHash: hashPassword(password), status: 'active' };
    this.users.set(normalized, user);
    this.audit({ type: 'identity.user.created', userId: user.id });
    return { id: user.id, email: user.email, status: user.status };
  }

  getUser(userId) {
    const user = [...this.users.values()].find(x => x.id === userId);
    if (!user) throw new Error('identity_not_found');
    return { id: user.id, email: user.email, status: user.status };
  }

  changeUserStatus({ userId, status }) {
    const user = [...this.users.values()].find(x => x.id === userId);
    if (!user) throw new Error('identity_not_found');
    assertIdentityTransition(user.status, status);
    if (user.status === status) return { id: user.id, email: user.email, status: user.status };
    const previousStatus = user.status;
    user.status = status;
    if (status !== 'active') {
      for (const session of this.sessions.values()) {
        if (session.userId !== user.id) continue;
        session.revoked = true;
        const family = this.refreshFamilies.get(session.familyId);
        if (family) family.revoked = true;
      }
    }
    this.audit({ type: 'identity.user.status_changed', userId: user.id, previousStatus, status });
    return { id: user.id, email: user.email, status: user.status };
  }

  addMembership({ userId, tenantId, roles = [] }) {
    if (!userId || !tenantId) throw new Error('invalid_membership');
    const user = [...this.users.values()].find(x => x.id === userId);
    if (!user) throw new Error('identity_not_found');
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error('tenant_not_found');
    if (tenant.status !== 'active') throw new Error('tenant_inactive');
    const organization = this.organizations.get(tenant.organizationId);
    if (!organization || organization.status !== 'active') throw new Error('organization_inactive');
    const membership = { userId, tenantId, roles: [...new Set(roles)], status: 'active' };
    this.memberships.set(`${userId}:${tenantId}`, membership);
    this.audit({ type: 'identity.membership.created', userId, tenantId });
    return membership;
  }

  grantRolePermission(role, permission) {
    const set = this.permissions.get(role) ?? new Set();
    set.add(permission);
    this.permissions.set(role, set);
  }

  authenticatePassword({ email, password, tenantId }) {
    const normalized = normalizeEmail(email);
    const user = this.users.get(normalized);
    if (!user || user.status !== 'active' || !verifyPassword(password, user.passwordHash)) {
      this.audit({ type: 'auth.login.failed', email: normalized });
      throw new Error('invalid_credentials');
    }
    const tenant = this.tenants.get(tenantId);
    const organization = tenant ? this.organizations.get(tenant.organizationId) : null;
    if (!tenant || tenant.status !== 'active' || !organization || organization.status !== 'active') throw new Error('tenant_access_denied');
    const membership = this.memberships.get(`${user.id}:${tenantId}`);
    if (!membership || membership.status !== 'active') throw new Error('tenant_access_denied');
    const accessToken = randomToken();
    const refreshToken = randomToken();
    const sessionId = `ses_${randomToken()}`;
    const familyId = `rtf_${randomToken()}`;
    const now = this.clock();
    const refreshDigest = tokenDigest(refreshToken);
    this.sessions.set(sessionId, { id: sessionId, userId: user.id, tenantId, familyId, revoked: false, accessDigest: tokenDigest(accessToken), accessExpiresAt: now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000 });
    this.refreshFamilies.set(familyId, { id: familyId, userId: user.id, tenantId, currentDigest: refreshDigest, expiresAt: now + SECURITY_PARAMETERS.refreshTokenTtlSeconds * 1000, revoked: false });
    this.refreshTokens.set(refreshDigest, { familyId, used: false });
    this.audit({ type: 'auth.login.succeeded', userId: user.id, tenantId, sessionId });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: SECURITY_PARAMETERS.accessTokenTtlSeconds, sessionId };
  }

  authenticateAccessToken(token) {
    if (typeof token !== 'string' || token.length < 20) throw new Error('unauthorized');
    const digest = tokenDigest(token);
    const now = this.clock();
    for (const session of this.sessions.values()) {
      if (session.revoked || session.accessExpiresAt <= now || session.accessDigest !== digest) continue;
      const user = [...this.users.values()].find(x => x.id === session.userId);
      const membership = this.memberships.get(`${session.userId}:${session.tenantId}`);
      const tenant = this.tenants.get(session.tenantId);
      const organization = tenant ? this.organizations.get(tenant.organizationId) : null;
      if (!user || user.status !== 'active' || !membership || membership.status !== 'active' || !tenant || tenant.status !== 'active' || !organization || organization.status !== 'active') throw new Error('unauthorized');
      return { userId: session.userId, tenantId: session.tenantId, organizationId: tenant.organizationId, sessionId: session.id, roles: membership.roles };
    }
    throw new Error('unauthorized');
  }

  refresh(refreshToken) {
    const digest = tokenDigest(refreshToken);
    const now = this.clock();
    const tokenRecord = this.refreshTokens.get(digest);
    if (!tokenRecord) throw new Error('invalid_refresh_token');
    const family = this.refreshFamilies.get(tokenRecord.familyId);
    const tenant = family ? this.tenants.get(family.tenantId) : null;
    const organization = tenant ? this.organizations.get(tenant.organizationId) : null;
    if (!family || family.expiresAt <= now || !tenant || tenant.status !== 'active' || !organization || organization.status !== 'active') throw new Error('invalid_refresh_token');
    if (family.revoked || tokenRecord.used || family.currentDigest !== digest) {
      family.revoked = true;
      for (const session of this.sessions.values()) if (session.familyId === family.id) session.revoked = true;
      this.audit({ type: 'auth.refresh.reuse_detected', familyId: family.id, userId: family.userId, tenantId: family.tenantId });
      throw new Error('refresh_reuse_detected');
    }
    const newRefresh = randomToken();
    const newAccess = randomToken();
    tokenRecord.used = true;
    const newDigest = tokenDigest(newRefresh);
    family.currentDigest = newDigest;
    this.refreshTokens.set(newDigest, { familyId: family.id, used: false });
    const session = [...this.sessions.values()].find(x => x.familyId === family.id && !x.revoked);
    if (!session) throw new Error('unauthorized');
    session.accessDigest = tokenDigest(newAccess);
    session.accessExpiresAt = now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000;
    this.audit({ type: 'auth.refresh.rotated', userId: family.userId, tenantId: family.tenantId, sessionId: session.id });
    return { accessToken: newAccess, refreshToken: newRefresh, tokenType: 'Bearer', expiresIn: SECURITY_PARAMETERS.accessTokenTtlSeconds };
  }

  revokeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.revoked = true;
    const family = this.refreshFamilies.get(session.familyId);
    if (family) family.revoked = true;
    this.audit({ type: 'auth.session.revoked', sessionId, userId: session.userId, tenantId: session.tenantId });
  }

  authorize(context, permission, resourceTenantId) {
    if (!context?.userId || !context?.tenantId || context.tenantId !== resourceTenantId) return false;
    const tenant = this.tenants.get(context.tenantId);
    const organization = tenant ? this.organizations.get(tenant.organizationId) : null;
    if (!tenant || tenant.status !== 'active' || !organization || organization.status !== 'active') return false;
    const membership = this.memberships.get(`${context.userId}:${context.tenantId}`);
    if (!membership || membership.status !== 'active') return false;
    return membership.roles.some(role => this.permissions.get(role)?.has(permission));
  }
}
