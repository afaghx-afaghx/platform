import { normalizeEmail, hashPassword, verifyPassword, randomToken, tokenDigest, SECURITY_PARAMETERS } from './security.js';

export const IDENTITY_STATUSES = Object.freeze(['active', 'disabled', 'locked', 'deleted']);

const IDENTITY_TRANSITIONS = Object.freeze({
  active: new Set(['disabled', 'locked', 'deleted']),
  disabled: new Set(['active', 'deleted']),
  locked: new Set(['active', 'disabled', 'deleted']),
  deleted: new Set(),
});

function assertIdentityStatus(status) {
  if (!IDENTITY_STATUSES.includes(status)) throw new Error('invalid_identity_status');
}

function assertIdentityTransition(current, next) {
  assertIdentityStatus(next);
  if (current === next) return;
  if (!IDENTITY_TRANSITIONS[current]?.has(next)) throw new Error('invalid_identity_transition');
}

export class AfxCore {
  constructor({ clock = () => Date.now(), audit = () => {} } = {}) {
    this.clock = clock;
    this.audit = audit;
    this.users = new Map();
    this.memberships = new Map();
    this.permissions = new Map();
    this.sessions = new Map();
    this.refreshFamilies = new Map();
    this.refreshTokens = new Map();
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
    const membership = this.memberships.get(`${user.id}:${tenantId}`);
    if (!membership || membership.status !== 'active') throw new Error('tenant_access_denied');

    const accessToken = randomToken();
    const refreshToken = randomToken();
    const sessionId = `ses_${randomToken()}`;
    const familyId = `rtf_${randomToken()}`;
    const now = this.clock();
    const refreshDigest = tokenDigest(refreshToken);
    this.sessions.set(sessionId, {
      id: sessionId, userId: user.id, tenantId, familyId, revoked: false,
      accessDigest: tokenDigest(accessToken),
      accessExpiresAt: now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000
    });
    this.refreshFamilies.set(familyId, {
      id: familyId, userId: user.id, tenantId, currentDigest: refreshDigest,
      expiresAt: now + SECURITY_PARAMETERS.refreshTokenTtlSeconds * 1000, revoked: false
    });
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
      if (!user || user.status !== 'active' || !membership || membership.status !== 'active') throw new Error('unauthorized');
      return { userId: session.userId, tenantId: session.tenantId, sessionId: session.id, roles: membership.roles };
    }
    throw new Error('unauthorized');
  }

  refresh(refreshToken) {
    const digest = tokenDigest(refreshToken);
    const now = this.clock();
    const tokenRecord = this.refreshTokens.get(digest);
    if (!tokenRecord) throw new Error('invalid_refresh_token');
    const family = this.refreshFamilies.get(tokenRecord.familyId);
    if (!family || family.expiresAt <= now) throw new Error('invalid_refresh_token');
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
    const membership = this.memberships.get(`${context.userId}:${context.tenantId}`);
    if (!membership || membership.status !== 'active') return false;
    return membership.roles.some(role => this.permissions.get(role)?.has(permission));
  }
}
