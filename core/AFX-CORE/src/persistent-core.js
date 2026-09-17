import { normalizeEmail, hashPassword, verifyPassword, randomToken, tokenDigest, SECURITY_PARAMETERS } from './security.js';
import { validateLocationInput, toPublicLocationEvent } from './location-contract.js';

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
      await this.audit({ type: 'auth.login.failed', email: normalized });
      throw new Error('invalid_credentials');
    }
    const membership = await this.repository.findMembership(user.id, tenantId);
    if (!membership || membership.status !== 'active') throw new Error('tenant_access_denied');
    const accessToken = randomToken();
    const refreshToken = randomToken();
    const sessionId = `ses_${randomToken()}`;
    const familyId = `rtf_${randomToken()}`;
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
    const user = await this.repository.findUserById(session.userId);
    const membership = await this.repository.findMembership(session.userId, session.tenantId);
    if (!user || user.status !== 'active' || !membership || membership.status !== 'active') throw new Error('unauthorized');
    return { userId: session.userId, tenantId: session.tenantId, sessionId: session.id, roles: membership.roles };
  }

  async recordLocation({ context, location }) {
    const input = validateLocationInput(location);
    if (!context?.userId || !context?.sessionId || !context?.tenantId) throw new Error('unauthorized');
    const event = {
      id: `loc_${randomToken()}`,
      userId: context.userId,
      sessionId: context.sessionId,
      tenantId: context.tenantId,
      ...input,
    };
    await this.repository.createLocationEvent(event);
    await this.audit({ type: 'identity.location.recorded', userId: event.userId, tenantId: event.tenantId, sessionId: event.sessionId, locationEventId: event.id, purpose: event.purpose, source: event.source, consent: event.consent });
    return { id: event.id, recorded: true, timestamp: event.timestamp, source: event.source };
  }

  async recordSessionLocation({ context, location }) {
    return this.recordLocation({ context, location: { ...location, purpose: 'session' } });
  }

  async listLocationEvents({ context, userId = context?.userId, sessionId, limit = 20 }) {
    if (!context?.userId || !context?.tenantId) throw new Error('unauthorized');
    if (userId !== context.userId) throw new Error('forbidden');
    const events = await this.repository.listLocationEvents({ tenantId: context.tenantId, userId, sessionId, limit });
    return events.map(toPublicLocationEvent);
  }

  async refresh(refreshToken) {
    const digest = tokenDigest(refreshToken);
    const newRefresh = randomToken();
    const newAccess = randomToken();
    const now = this.clock();
    try {
      const family = await this.repository.rotateRefreshToken({ digest, newDigest: tokenDigest(newRefresh), newAccessDigest: tokenDigest(newAccess), now, accessExpiresAt: now + SECURITY_PARAMETERS.accessTokenTtlSeconds * 1000 });
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
    const membership = await this.repository.findMembership(context.userId, context.tenantId);
    if (!membership || membership.status !== 'active') return false;
    for (const role of membership.roles) if (await this.repository.hasRolePermission(role, permission)) return true;
    return false;
  }
}
