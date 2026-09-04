import { normalizeEmail, hashPassword, verifyPassword, randomToken, tokenDigest, SECURITY_PARAMETERS } from './security.js';

export class AfxCore {
  constructor({ clock = () => Date.now(), audit = () => {} } = {}) {
    this.clock = clock;
    this.audit = audit;
    this.users = new Map();
    this.memberships = new Map();
    this.permissions = new Map();
    this.sessions = new Map();
    this.refreshFamilies = new Map();
  }

  createUser({ email, password }) {
    const normalized = normalizeEmail(email);
    if (this.users.has(normalized)) throw new Error('user_exists');
    const user = { id: `usr_${randomToken()}`, email: normalized, passwordHash: hashPassword(password), status: 'active' };
    this.users.set(normalized, user);
    this.audit({ type: 'identity.user.created', userId: user.id });
    return { id: user.id, email: user.email, status: user.status };
  }

  addMembership({ userId, tenantId, roles = [] }) {
    if (!userId || !tenantId) throw new Error('invalid_membership');
    const key = `${userId}:${tenantId}`;
    const membership = { userId, tenantId, roles: [...new Set(roles)], status: 'active' };
    this.memberships.set(key, membership);
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
    // Deliberately do not reveal whether the identity exists to callers.
    if (!user || user.status !== 'active' || !verifyPassword(password, user.passwordHash)) {
      this.audit({ type: 'auth.login.failed', email: normalized });
      throw new Error('invalid_credentials');
    }
    const membership = this.memberships.get(`${user.id}:${tenantId}`);
    if (!membership || membership.status !== 'active') throw new Error('tenant_access_denied');

    const accessToken = randomToken();
    const refreshToken = randomToken();
    const sessionId = `ses_${randomToken()}`;
    const familyId = `rtf_${randomToken()}`;
    const now = this.clock();
    this.sessions.set(sessionId, {
      id: sessionId, userId: user.id, tenantId, familyId, revoked: false,
      accessDigest: tokenDigest(accessToken),
      accessExpiresAt: now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000
    });
    this.refreshFamilies.set(familyId, {
      id: familyId, userId: user.id, tenantId, currentDigest: tokenDigest(refreshToken),
      expiresAt: now + SECURITY_PARAMETERS.refreshTokenTtlSeconds * 1000, revoked: false
    });
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
      if (!user || user.status !== 'active' || !membership || membership.status !== 'active') throw new Error('unauthorized');
      return { userId: session.userId, tenantId: session.tenantId, sessionId: session.id, roles: membership.roles };
    }
    throw new Error('unauthorized');
  }

  refresh(refreshToken) {
    const digest = tokenDigest(refreshToken);
    const now = this.clock();
    for (const family of this.refreshFamilies.values()) {
      if (family.revoked || family.expiresAt <= now) continue;
      if (family.currentDigest !== digest) continue;
      const newRefresh = randomToken();
      const newAccess = randomToken();
      family.currentDigest = tokenDigest(newRefresh);
      const session = [...this.sessions.values()].find(x => x.familyId === family.id && !x.revoked);
      if (!session) throw new Error('unauthorized');
      session.accessDigest = tokenDigest(newAccess);
      session.accessExpiresAt = now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000;
      this.audit({ type: 'auth.refresh.rotated', userId: family.userId, tenantId: family.tenantId, sessionId: session.id });
      return { accessToken: newAccess, refreshToken: newRefresh, tokenType: 'Bearer', expiresIn: SECURITY_PARAMETERS.accessTokenTtlSeconds };
    }
    // A previously used refresh token indicates reuse: revoke the whole family.
    for (const family of this.refreshFamilies.values()) {
      if (family.expiresAt > now && !family.revoked) {
        family.revoked = true;
        for (const session of this.sessions.values()) if (session.familyId === family.id) session.revoked = true;
      }
    }
    this.audit({ type: 'auth.refresh.reuse_detected' });
    throw new Error('refresh_reuse_detected');
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
    const membership = this.memberships.get(`${context.userId}:${context.tenantId}`);
    if (!membership || membership.status !== 'active') return false;
    return membership.roles.some(role => this.permissions.get(role)?.has(permission));
  }
}
