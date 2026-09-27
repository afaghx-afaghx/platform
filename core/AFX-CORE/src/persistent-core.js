import { normalizeEmail, hashPassword, verifyPassword, randomToken, tokenDigest, SECURITY_PARAMETERS } from './security.js';
import { createPolicyEvaluator, normalizePolicy } from './policy.js';

export class PersistentAfxCore {
  constructor({ repository, clock = () => Date.now(), audit = async () => {} }) {
    this.repository = repository;
    this.clock = clock;
    this.audit = audit;
    this.policyEvaluator = createPolicyEvaluator({
      listPolicies: (tenantId) => this.repository.listPolicies(tenantId),
      clock: this.clock
    });
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

  async registerPolicy(policy) {
    const normalized = normalizePolicy(policy);
    await this.repository.createPolicy(normalized);
    await this.audit({ type: 'policy.created', policyId: normalized.id, tenantId: normalized.tenantId });
    return normalized;
  }

  async evaluatePolicy(context, { permission, resourceTenantId, resourceState } = {}) {
    return this.policyEvaluator.evaluate(context, { permission, resourceTenantId, resourceState });
  }

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

  async authorize(context, permission, resourceTenantId, resourceState) {
    if (!context?.userId || !context?.tenantId || context.tenantId !== resourceTenantId) return false;
    const membership = await this.repository.findMembership(context.userId, context.tenantId);
    if (!membership || membership.status !== 'active') return false;
    let rbacAllowed = false;
    for (const role of membership.roles) if (await this.repository.hasRolePermission(role, permission)) { rbacAllowed = true; break; }
    if (!rbacAllowed) return false;
    const policy = await this.evaluatePolicy(context, { permission, resourceTenantId, resourceState });
    if (policy.decision === 'deny') {
      await this.audit({ type: 'policy.access.denied', userId: context.userId, tenantId: context.tenantId, permission, policyIds: policy.policyIds });
      return false;
    }
    return true;
  }
}
