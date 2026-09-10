import { normalizeEmail, hashPassword, verifyPassword, randomToken, tokenDigest, SECURITY_PARAMETERS } from './security.js';
import { decryptMfaSecret, encryptMfaSecret, generateMfaSecret, generateRecoveryCodes, verifyTotpStep, MFA_PARAMETERS } from './mfa.js';
import { PersistentWebAuthnService } from './persistent-webauthn.js';

function digestRecoveryCode(value) {
  return tokenDigest(value);
}

export class PersistentAfxCore {
  constructor({ repository, clock = () => Date.now(), audit = async () => {}, mfaEncryptionKey, webauthn = null } = {}) {
    this.repository = repository;
    this.clock = clock;
    this.audit = audit;
    this.mfaEncryptionKey = mfaEncryptionKey;
    this.webauthn = webauthn ? new PersistentWebAuthnService({ repository, clock, ...webauthn }) : null;
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

  async beginWebAuthnRegistration({ userId, userName, displayName }) {
    if (!this.webauthn) throw new Error('webauthn_unavailable');
    return this.webauthn.beginRegistrationPersistent({ userId, userName, displayName });
  }

  async finishWebAuthnRegistration({ userId, challengeId, credential, origin }) {
    if (!this.webauthn) throw new Error('webauthn_unavailable');
    const result = await this.webauthn.finishRegistrationPersistent({ userId, challengeId, credential, origin });
    await this.audit({ type: 'auth.webauthn.credential.registered', userId, credentialId: result.credentialId });
    return result;
  }

  async beginWebAuthnAuthentication({ userId = null, allowCredentials = [] } = {}) {
    if (!this.webauthn) throw new Error('webauthn_unavailable');
    return this.webauthn.beginAuthenticationPersistent({ userId, allowCredentials });
  }

  async finishWebAuthnAuthentication({ userId = null, challengeId, credential, origin }) {
    if (!this.webauthn) throw new Error('webauthn_unavailable');
    const result = await this.webauthn.finishAuthenticationPersistent({ userId, challengeId, credential, origin });
    await this.audit({ type: 'auth.webauthn.authenticated', userId: result.userId, credentialId: result.credentialId });
    return result;
  }

  async revokeWebAuthnCredential(credentialId) {
    if (!this.webauthn) throw new Error('webauthn_unavailable');
    const revoked = await this.webauthn.revokeCredentialPersistent(credentialId);
    if (revoked) await this.audit({ type: 'auth.webauthn.credential.revoked', credentialId });
    return revoked;
  }

  async listWebAuthnCredentials(userId) {
    if (!this.webauthn) throw new Error('webauthn_unavailable');
    return this.webauthn.listCredentialsPersistent(userId);
  }

  async beginMfaEnrollment({ userId }) {
    const user = await this.repository.findUserById(userId);
    if (!user || user.status !== 'active') throw new Error('unauthorized');
    const secret = generateMfaSecret();
    await this.audit({ type: 'auth.mfa.enrollment_started', userId });
    return { secret, parameters: MFA_PARAMETERS.totp };
  }

  async confirmMfaEnrollment({ userId, secret, code }) {
    if (!userId || typeof secret !== 'string') throw new Error('invalid_mfa_enrollment');
    if (verifyTotpStep({ secret, code, nowMs: this.clock() }) === null) throw new Error('invalid_mfa_code');
    const encrypted = encryptMfaSecret(secret, this.mfaEncryptionKey);
    const recoveryCodes = generateRecoveryCodes();
    await this.repository.upsertMfaFactor({ userId, secretEncrypted: encrypted, version: 1, active: true, lastTotpStep: null });
    await this.repository.replaceMfaRecoveryCodes(userId, recoveryCodes.map(codeValue => ({ id: `mrc_${randomToken()}`, codeDigest: digestRecoveryCode(codeValue) })));
    await this.audit({ type: 'auth.mfa.enrollment_confirmed', userId });
    return { enabled: true, recoveryCodes };
  }

  async revokeMfa(userId) {
    const revoked = await this.repository.revokeMfaFactor(userId);
    if (revoked) await this.audit({ type: 'auth.mfa.revoked', userId });
    return revoked;
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
    const factor = await this.repository.getMfaFactor(user.id);
    if (factor?.active) {
      const challengeId = `mch_${randomToken()}`;
      const now = this.clock();
      await this.repository.createMfaChallenge({ id: challengeId, userId: user.id, tenantId, expiresAt: now + MFA_PARAMETERS.challengeTtlSeconds * 1000 });
      await this.audit({ type: 'auth.login.mfa_required', userId: user.id, tenantId, challengeId });
      return { mfaRequired: true, challengeId, expiresIn: MFA_PARAMETERS.challengeTtlSeconds };
    }
    return this.#issueSession({ user, tenantId });
  }

  async completeMfaAuthentication({ challengeId, code, recoveryCode }) {
    const now = this.clock();
    const challenge = await this.repository.getMfaChallenge(challengeId);
    if (!challenge || challenge.consumed || challenge.expiresAt <= now || challenge.attempts >= MFA_PARAMETERS.maxAttempts) throw new Error('invalid_mfa_challenge');
    const factor = await this.repository.getMfaFactor(challenge.userId);
    if (!factor?.active) throw new Error('mfa_not_enrolled');

    let factorAccepted = false;
    if (typeof recoveryCode === 'string') {
      factorAccepted = await this.repository.consumeMfaRecoveryCode({ userId: challenge.userId, codeDigest: digestRecoveryCode(recoveryCode) });
    } else if (typeof code === 'string') {
      const secret = decryptMfaSecret(factor.secretEncrypted, this.mfaEncryptionKey);
      const step = verifyTotpStep({ secret, code, nowMs: now });
      factorAccepted = step !== null && await this.repository.acceptTotpStep({ userId: challenge.userId, step });
    }
    if (!factorAccepted) {
      await this.repository.incrementMfaChallengeAttempt({ id: challengeId, maxAttempts: MFA_PARAMETERS.maxAttempts, now });
      await this.audit({ type: 'auth.mfa.verification_failed', userId: challenge.userId, challengeId });
      throw new Error('invalid_mfa_code');
    }
    if (!await this.repository.consumeMfaChallenge({ id: challengeId, maxAttempts: MFA_PARAMETERS.maxAttempts, now })) throw new Error('invalid_mfa_challenge');
    const user = await this.repository.findUserById(challenge.userId);
    const membership = await this.repository.findMembership(challenge.userId, challenge.tenantId);
    if (!user || user.status !== 'active' || !membership || membership.status !== 'active') throw new Error('unauthorized');
    await this.audit({ type: 'auth.mfa.verified', userId: user.id, tenantId: challenge.tenantId, challengeId });
    return this.#issueSession({ user, tenantId: challenge.tenantId });
  }

  async #issueSession({ user, tenantId }) {
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
    const digest = tokenDigest(refreshToken); const newRefresh = randomToken(); const newAccess = randomToken(); const now = this.clock();
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

  async authorize(context, permission, resourceTenantId) {
    if (!context?.userId || !context?.tenantId || context.tenantId !== resourceTenantId) return false;
    const membership = await this.repository.findMembership(context.userId, context.tenantId);
    if (!membership || membership.status !== 'active') return false;
    for (const role of membership.roles) if (await this.repository.hasRolePermission(role, permission)) return true;
    return false;
  }
}
