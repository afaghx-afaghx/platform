import { normalizeEmail, hashPassword, verifyPassword, randomToken, tokenDigest, SECURITY_PARAMETERS } from './security.js';

const AUDIT_FIELDS = Object.freeze(['type', 'userId', 'tenantId', 'sessionId', 'familyId', 'email']);

function sanitizeAuditEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('invalid_audit_event');
  if (typeof event.type !== 'string' || event.type.trim().length === 0 || event.type.length > 128) throw new Error('invalid_audit_event');

  const safe = { type: event.type.trim() };
  for (const key of AUDIT_FIELDS.slice(1)) {
    const value = event[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string' || value.length === 0 || value.length > 512) throw new Error('invalid_audit_event');
    safe[key] = value;
  }
  return Object.freeze(safe);
}

export class PersistentAfxCore {
  constructor({ repository, clock = () => Date.now(), audit = null }) {
    this.repository = repository;
    this.clock = clock;
    this.audit = typeof audit === 'function' ? audit : null;
  }

  async migrate() { return this.repository.migrate(); }

  async emitAudit(event) {
    const safeEvent = sanitizeAuditEvent(event);
    await this.repository.appendAuditEvent(safeEvent);
    if (this.audit) await this.audit(safeEvent);
    return safeEvent;
  }

  async createUser({ email, password }) {
    const normalized = normalizeEmail(email);
    const existing = await this.repository.findUserByEmail(normalized);
    if (existing) throw new Error('user_exists');
    const user = { id: `usr_${randomToken()}`, email: normalized, passwordHash: hashPassword(password), status: 'active' };
    await this.repository.createUser(user);
    await this.emitAudit({ type: 'identity.user.created', userId: user.id });
    return { id: user.id, email: user.email, status: user.status };
  }

  async addMembership({ userId, tenantId, roles = [] }) {
    if (!userId || !tenantId || !Array.isArray(roles) || roles.some(role => typeof role !== 'string' || role.trim().length === 0)) throw new Error('invalid_membership');
    const membership = { userId, tenantId, roles: [...new Set(roles.map(role => role.trim()))], status: 'active' };
    await this.repository.createMembership(membership);
    await this.emitAudit({ type: 'identity.membership.created', userId, tenantId });
    return membership;
  }

  async grantRolePermission(role, permission) {
    if (typeof role !== 'string' || !role.trim() || typeof permission !== 'string' || !permission.trim()) throw new Error('invalid_permission');
    return this.repository.grantRolePermission(role.trim(), permission.trim());
  }

  async authenticatePassword({ email, password, tenantId }) {
    const normalized = normalizeEmail(email);
    const user = await this.repository.findUserByEmail(normalized);
    if (!user || user.status !== 'active' || !verifyPassword(password, user.passwordHash)) {
      await this.emitAudit({ type: 'auth.login.failed', email: normalized });
      throw new Error('invalid_credentials');
    }
    const membership = await this.repository.findMembership(user.id, tenantId);
    if (!membership || membership.status !== 'active') throw new Error('tenant_access_denied');
    const accessToken = randomToken();
    const refreshToken = randomToken();
    const sessionId = `ses_${randomToken()}`;
    const familyId = `rtf_${randomToken()}`;
    const now = this.clock();
    await this.repository.createAuthenticationSession({
      family: { id: familyId, userId: user.id, tenantId, currentDigest: tokenDigest(refreshToken), expiresAt: now + SECURITY_PARAMETERS.refreshTokenTtlSeconds * 1000, revoked: false },
      session: { id: sessionId, userId: user.id, tenantId, familyId, revoked: false, accessDigest: tokenDigest(accessToken), accessExpiresAt: now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000 },
      refreshToken: { digest: tokenDigest(refreshToken), familyId, used: false }
    });
    await this.emitAudit({ type: 'auth.login.succeeded', userId: user.id, tenantId, sessionId });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: SECURITY_PARAMETERS.accessTokenTtlSeconds, sessionId };
  }

  async authenticateAccessToken(token) {
    if (typeof token !== 'string' || token.length < 20) throw new Error('unauthorized');
    const session = await this.repository.findSessionByAccessDigest(tokenDigest(token));
    const now = this.clock();
    if (!session || session.revoked || session.accessExpiresAt <= now) throw new Error('unauthorized');
    const user = await this.repository.findUserById(session.userId);
    const membership = await this.repository.findMembership(session.userId, session.tenantId);
    if (!user || user.status !== 'active' || !membership || membership.status !== 'active') throw new Error('unauthorized');
    return { userId: session.userId, tenantId: session.tenantId, sessionId: session.id, roles: membership.roles };
  }

  async refresh(refreshToken) {
    if (typeof refreshToken !== 'string' || refreshToken.length < 20) throw new Error('invalid_refresh_token');
    const digest = tokenDigest(refreshToken);
    const newRefresh = randomToken();
    const newAccess = randomToken();
    const now = this.clock();
    try {
      const family = await this.repository.rotateRefreshToken({ digest, newDigest: tokenDigest(newRefresh), newAccessDigest: tokenDigest(newAccess), now, accessExpiresAt: now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000 });
      await this.emitAudit({ type: 'auth.refresh.rotated', userId: family.userId, tenantId: family.tenantId });
      return { accessToken: newAccess, refreshToken: newRefresh, tokenType: 'Bearer', expiresIn: SECURITY_PARAMETERS.accessTokenTtlSeconds };
    } catch (error) {
      if (error.message === 'refresh_reuse_detected') {
        const token = await this.repository.getRefreshToken(digest);
        if (token) {
          await this.repository.revokeRefreshFamily(token.familyId);
          await this.emitAudit({ type: 'auth.refresh.reuse_detected', familyId: token.familyId });
        } else {
          await this.emitAudit({ type: 'auth.refresh.reuse_detected' });
        }
      }
      throw error;
    }
  }

  async revokeSession(sessionId) {
    await this.repository.revokeSession(sessionId);
    await this.emitAudit({ type: 'auth.session.revoked', sessionId });
  }

  async authorize(context, permission, resourceTenantId) {
    if (typeof permission !== 'string' || permission.trim().length === 0) return false;
    if (!context?.userId || !context?.tenantId || context.tenantId !== resourceTenantId) return false;
    const membership = await this.repository.findMembership(context.userId, context.tenantId);
    if (!membership || membership.status !== 'active') return false;
    for (const role of membership.roles) if (await this.repository.hasRolePermission(role, permission.trim())) return true;
    return false;
  }
}
