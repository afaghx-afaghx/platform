import { normalizeEmail, hashPassword, verifyPassword, randomToken, tokenDigest, SECURITY_PARAMETERS } from './security.js';

export class PersistentAfxCore {
  constructor({ repository, clock = () => Date.now(), audit = async () => {} }) {
    this.repository = repository;
    this.clock = clock;
    this.audit = audit;
  }
  async migrate() { return this.repository.migrate(); }
  async createUser({ email, password }) {
    const normalized = normalizeEmail(email);
    const existing = await this.repository.findUserByEmail(normalized);
    if (existing) throw new Error('user_exists');
    const user = { id: `usr_${randomToken()}`, email: normalized, passwordHash: hashPassword(password), status: 'active' };
    await this.repository.createUser(user);
    await this.audit({ type: 'identity.user.created', userId: user.id });
    return { id: user.id, email: user.email, status: user.status };
  }
  async addMembership({ userId, tenantId, roles = [] }) {
    if (!userId || !tenantId) throw new Error('invalid_membership');
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
      await this.audit({ type: 'auth.login.failed', email: normalized }); throw new Error('invalid_credentials');
    }
    const membership = await this.repository.findMembership(user.id, tenantId);
    if (!membership || membership.status !== 'active') throw new Error('tenant_access_denied');
    const accessToken = randomToken(), refreshToken = randomToken(), sessionId = `ses_${randomToken()}`, familyId = `rtf_${randomToken()}`;
    const now = this.clock();
    await this.repository.createSession({ id: sessionId, userId: user.id, tenantId, familyId, revoked: false, accessDigest: tokenDigest(accessToken), accessExpiresAt: now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000 });
    await this.repository.createRefreshFamily({ id: familyId, userId: user.id, tenantId, currentDigest: tokenDigest(refreshToken), expiresAt: now + SECURITY_PARAMETERS.refreshTokenTtlSeconds * 1000, revoked: false });
    await this.repository.createRefreshToken({ digest: tokenDigest(refreshToken), familyId, used: false });
    await this.audit({ type: 'auth.login.succeeded', userId: user.id, tenantId, sessionId });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: SECURITY_PARAMETERS.accessTokenTtlSeconds, sessionId };
  }
  async authenticateAccessToken(token) {
    if (typeof token !== 'string' || token.length < 20) throw new Error('unauthorized');
    const session = await this.repository.findSessionByAccessDigest(tokenDigest(token));
    const now = this.clock();
    if (!session || session.revoked || session.accessExpiresAt <= now) throw new Error('unauthorized');
    const user = await this.repository.findUserById(session.userId), membership = await this.repository.findMembership(session.userId, session.tenantId);
    if (!user || user.status !== 'active' || !membership || membership.status !== 'active') throw new Error('unauthorized');
    return { userId: session.userId, tenantId: session.tenantId, sessionId: session.id, roles: membership.roles };
  }
  async refresh(refreshToken) {
    if (typeof refreshToken !== 'string' || refreshToken.length < 20) throw new Error('invalid_refresh_token');
    const digest = tokenDigest(refreshToken), newRefresh = randomToken(), newAccess = randomToken(), now = this.clock();
    try {
      const family = await this.repository.rotateRefreshToken({ digest, newDigest: tokenDigest(newRefresh), newAccessDigest: tokenDigest(newAccess), now, accessExpiresAt: now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000 });
      await this.audit({ type: 'auth.refresh.rotated', userId: family.userId, tenantId: family.tenantId });
      return { accessToken: newAccess, refreshToken: newRefresh, tokenType: 'Bearer', expiresIn: SECURITY_PARAMETERS.accessTokenTtlSeconds };
    } catch (error) {
      if (error.message === 'refresh_reuse_detected') { const token = await this.repository.getRefreshToken(digest); if (token) await this.repository.revokeRefreshFamily(token.familyId); await this.audit({ type: 'auth.refresh.reuse_detected' }); }
      throw error;
    }
  }
  async revokeSession(sessionId) { await this.repository.revokeSession(sessionId); await this.audit({ type: 'auth.session.revoked', sessionId }); }
  async setUserStatus({ userId, status }) {
    if (!['active','disabled'].includes(status)) throw new Error('invalid_user_status');
    await this.repository.updateUserStatus(userId, status);
    if (status === 'disabled') await this.repository.revokeUserSessions(userId);
    await this.audit({ type: `identity.user.${status}`, userId });
  }
  async requestPasswordRecovery({ email }) {
    const normalized = normalizeEmail(email), user = await this.repository.findUserByEmail(normalized);
    if (!user || user.status === 'disabled') { await this.audit({ type: 'auth.recovery.requested' }); return { accepted: true }; }
    const rawToken = randomToken();
    await this.repository.createRecoveryToken({ userId: user.id, digest: tokenDigest(rawToken), expiresAt: this.clock() + SECURITY_PARAMETERS.recoveryTokenTtlSeconds * 1000 });
    await this.audit({ type: 'auth.recovery.requested', userId: user.id });
    return { accepted: true, recoveryToken: rawToken };
  }
  async completePasswordRecovery({ recoveryToken, newPassword }) {
    if (typeof recoveryToken !== 'string' || recoveryToken.length < 20 || typeof newPassword !== 'string' || newPassword.length < 12) throw new Error('invalid_recovery_request');
    const token = await this.repository.consumeRecoveryToken(tokenDigest(recoveryToken), this.clock());
    await this.repository.updateUserPassword(token.userId, hashPassword(newPassword));
    await this.repository.revokeUserSessions(token.userId);
    await this.audit({ type: 'auth.recovery.completed', userId: token.userId });
    return { completed: true };
  }
  async authorize(context, permission, resourceTenantId) {
    if (!context?.userId || !context?.tenantId || context.tenantId !== resourceTenantId) return false;
    const membership = await this.repository.findMembership(context.userId, context.tenantId);
    if (!membership || membership.status !== 'active') return false;
    for (const role of membership.roles) if (await this.repository.hasRolePermission(role, permission)) return true;
    return false;
  }
}
