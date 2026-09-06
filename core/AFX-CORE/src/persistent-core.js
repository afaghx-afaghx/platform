import { normalizeEmail, hashPassword, verifyPassword, randomToken, tokenDigest, SECURITY_PARAMETERS } from './security.js';
import { assertIdentityTransition, assertOrganizationTransition, assertTenantTransition } from './core.js';

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

export class PersistentAfxCore {
  constructor({ repository, clock = () => Date.now(), audit = async () => {} }) {
    this.repository = repository;
    this.clock = clock;
    this.audit = audit;
  }

  async migrate() { return this.repository.migrate(); }

  async createOrganization({ name, slug }) {
    const normalizedSlug = normalizeSlug(slug);
    const organization = { id: `org_${randomToken()}`, slug: normalizedSlug, name: validateName(name), status: 'active' };
    try { await this.repository.createOrganization(organization); }
    catch (error) { if (error.code === '23505') throw new Error('organization_exists'); throw error; }
    await this.audit({ type: 'organization.created', organizationId: organization.id });
    return { ...organization };
  }

  async getOrganization(organizationId) {
    const organization = await this.repository.findOrganizationById(organizationId);
    if (!organization) throw new Error('organization_not_found');
    return organization;
  }

  async changeOrganizationStatus({ organizationId, status }) {
    const organization = await this.repository.findOrganizationById(organizationId);
    if (!organization) throw new Error('organization_not_found');
    assertOrganizationTransition(organization.status, status);
    if (organization.status === status) return organization;
    const result = await this.repository.updateOrganizationStatus(organizationId, status);
    await this.audit({ type: 'organization.status_changed', organizationId, previousStatus: result.previousStatus, status: result.status });
    return result;
  }

  async createTenant({ organizationId, name, slug }) {
    const organization = await this.repository.findOrganizationById(organizationId);
    if (!organization) throw new Error('organization_not_found');
    if (organization.status !== 'active') throw new Error('organization_inactive');
    const tenant = { id: `ten_${randomToken()}`, organizationId, slug: normalizeSlug(slug), name: validateName(name), status: 'active' };
    try { await this.repository.createTenant(tenant); }
    catch (error) { if (error.code === '23505') throw new Error('tenant_exists'); throw error; }
    await this.audit({ type: 'tenant.created', tenantId: tenant.id, organizationId });
    return { ...tenant };
  }

  async getTenant(tenantId) {
    const tenant = await this.repository.findTenantById(tenantId);
    if (!tenant) throw new Error('tenant_not_found');
    return tenant;
  }

  async changeTenantStatus({ tenantId, status }) {
    const tenant = await this.repository.findTenantById(tenantId);
    if (!tenant) throw new Error('tenant_not_found');
    assertTenantTransition(tenant.status, status);
    if (tenant.status === status) return tenant;
    const result = await this.repository.updateTenantStatus(tenantId, status);
    await this.audit({ type: 'tenant.status_changed', tenantId, organizationId: result.organizationId, previousStatus: result.previousStatus, status: result.status });
    return { id: tenant.id, organizationId: tenant.organizationId, slug: tenant.slug, name: tenant.name, status: result.status };
  }

  async createUser({ email, password }) {
    const normalized = normalizeEmail(email);
    const existing = await this.repository.findUserByEmail(normalized);
    if (existing) throw new Error('user_exists');
    const user = { id: `usr_${randomToken()}`, email: normalized, passwordHash: hashPassword(password), status: 'active' };
    await this.repository.createUser(user);
    await this.audit({ type: 'identity.user.created', userId: user.id });
    return { id: user.id, email: user.email, status: user.status };
  }

  async getUser(userId) {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new Error('identity_not_found');
    return { id: user.id, email: user.email, status: user.status };
  }

  async changeUserStatus({ userId, status }) {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new Error('identity_not_found');
    assertIdentityTransition(user.status, status);
    if (user.status === status) return { id: user.id, email: user.email, status: user.status };
    const result = await this.repository.updateUserStatus(userId, status);
    await this.audit({ type: 'identity.user.status_changed', userId, previousStatus: result.previousStatus, status: result.status });
    return { id: user.id, email: user.email, status: result.status };
  }

  async addMembership({ userId, tenantId, roles = [] }) {
    if (!userId || !tenantId) throw new Error('invalid_membership');
    const user = await this.repository.findUserById(userId);
    if (!user) throw new Error('identity_not_found');
    const tenant = await this.repository.findTenantById(tenantId);
    if (!tenant) throw new Error('tenant_not_found');
    if (tenant.status !== 'active') throw new Error('tenant_inactive');
    const organization = await this.repository.findOrganizationById(tenant.organizationId);
    if (!organization || organization.status !== 'active') throw new Error('organization_inactive');
    const membership = { userId, tenantId, roles: [...new Set(roles)], status: 'active' };
    await this.repository.createMembership(membership);
    await this.audit({ type: 'identity.membership.created', userId, tenantId });
    return membership;
  }

  async grantRolePermission(role, permission) { return this.repository.grantRolePermission(role, permission); }

  async authenticatePassword({ email, password, tenantId }) {
    const normalized = normalizeEmail(email);
    const user = await this.repository.findUserByEmail(normalized);
    if (!user || user.status !== 'active' || !verifyPassword(password, user.passwordHash)) {
      await this.audit({ type: 'auth.login.failed', email: normalized });
      throw new Error('invalid_credentials');
    }
    const tenant = await this.repository.findTenantById(tenantId);
    const organization = tenant ? await this.repository.findOrganizationById(tenant.organizationId) : null;
    if (!tenant || tenant.status !== 'active' || !organization || organization.status !== 'active') throw new Error('tenant_access_denied');
    const membership = await this.repository.findMembership(user.id, tenantId);
    if (!membership || membership.status !== 'active') throw new Error('tenant_access_denied');
    const accessToken = randomToken();
    const refreshToken = randomToken();
    const sessionId = `ses_${randomToken()}`;
    const familyId = `rtf_${randomToken()}`;
    const now = this.clock();
    await this.repository.createAuthenticationState({
      session: { id: sessionId, userId: user.id, tenantId, familyId, revoked: false, accessDigest: tokenDigest(accessToken), accessExpiresAt: now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000 },
      refreshFamily: { id: familyId, userId: user.id, tenantId, currentDigest: tokenDigest(refreshToken), expiresAt: now + SECURITY_PARAMETERS.refreshTokenTtlSeconds * 1000, revoked: false },
      refreshToken: { digest: tokenDigest(refreshToken), familyId, used: false },
    });
    await this.audit({ type: 'auth.login.succeeded', userId: user.id, tenantId, sessionId });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: SECURITY_PARAMETERS.accessTokenTtlSeconds, sessionId };
  }

  async authenticateAccessToken(token) {
    if (typeof token !== 'string' || token.length < 20) throw new Error('unauthorized');
    const session = await this.repository.findSessionByAccessDigest(tokenDigest(token));
    const now = this.clock();
    if (!session || session.revoked || session.accessExpiresAt <= now) throw new Error('unauthorized');
    const user = await this.repository.findUserById(session.userId);
    const membership = await this.repository.findMembership(session.userId, session.tenantId);
    const tenant = await this.repository.findTenantById(session.tenantId);
    const organization = tenant ? await this.repository.findOrganizationById(tenant.organizationId) : null;
    if (!user || user.status !== 'active' || !membership || membership.status !== 'active' || !tenant || tenant.status !== 'active' || !organization || organization.status !== 'active') throw new Error('unauthorized');
    return { userId: session.userId, tenantId: session.tenantId, organizationId: tenant.organizationId, sessionId: session.id, roles: membership.roles };
  }

  async refresh(refreshToken) {
    const digest = tokenDigest(refreshToken);
    const newRefresh = randomToken();
    const newAccess = randomToken();
    const now = this.clock();
    try {
      const family = await this.repository.rotateRefreshToken({ digest, newDigest: tokenDigest(newRefresh), newAccessDigest: tokenDigest(newAccess), now, accessExpiresAt: now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000 });
      const tenant = await this.repository.findTenantById(family.tenantId);
      const organization = tenant ? await this.repository.findOrganizationById(tenant.organizationId) : null;
      if (!tenant || tenant.status !== 'active' || !organization || organization.status !== 'active') throw new Error('invalid_refresh_token');
      await this.audit({ type: 'auth.refresh.rotated', userId: family.userId, tenantId: family.tenantId });
      return { accessToken: newAccess, refreshToken: newRefresh, tokenType: 'Bearer', expiresIn: SECURITY_PARAMETERS.accessTokenTtlSeconds };
    } catch (error) {
      if (error.message === 'refresh_reuse_detected') {
        const token = await this.repository.getRefreshToken(digest);
        if (token) await this.repository.revokeRefreshFamily(token.familyId);
        await this.audit({ type: 'auth.refresh.reuse_detected' });
      }
      throw error;
    }
  }

  async revokeSession(sessionId) {
    await this.repository.revokeSession(sessionId);
    await this.audit({ type: 'auth.session.revoked', sessionId });
  }

  async authorize(context, permission, resourceTenantId) {
    if (!context?.userId || !context?.tenantId || context.tenantId !== resourceTenantId) return false;
    const tenant = await this.repository.findTenantById(context.tenantId);
    const organization = tenant ? await this.repository.findOrganizationById(tenant.organizationId) : null;
    if (!tenant || tenant.status !== 'active' || !organization || organization.status !== 'active') return false;
    const membership = await this.repository.findMembership(context.userId, context.tenantId);
    if (!membership || membership.status !== 'active') return false;
    for (const role of membership.roles) if (await this.repository.hasRolePermission(role, permission)) return true;
    return false;
  }
}
