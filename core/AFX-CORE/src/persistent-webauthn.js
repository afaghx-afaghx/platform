import { createPublicKey } from 'node:crypto';
import { WebAuthnService } from './webauthn.js';

function publicKeyToSpki(publicKey) {
  return publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
}

function spkiToPublicKey(value) {
  return createPublicKey({ key: Buffer.from(value, 'base64url'), format: 'der', type: 'spki' });
}

export class PersistentWebAuthnService extends WebAuthnService {
  constructor({ repository, rpId, origins, clock = () => Date.now() } = {}) {
    super({ rpId, origins, clock });
    if (!repository) throw new Error('repository_required');
    this.repository = repository;
  }

  async beginRegistrationPersistent(args) {
    const result = super.beginRegistration(args);
    const challenge = this.challenges.get(result.challengeId);
    await this.repository.createWebAuthnChallenge({
      id: challenge.id,
      userId: challenge.userId,
      kind: challenge.kind,
      challenge: challenge.challenge,
      rpId: this.rpId,
      expiresAt: challenge.expiresAt,
    });
    return result;
  }

  async finishRegistrationPersistent(args) {
    const persisted = await this.repository.getWebAuthnChallenge(args.challengeId);
    if (!persisted || persisted.kind !== 'registration' || persisted.userId !== args.userId || persisted.consumed || persisted.expiresAt <= this.clock()) {
      throw new Error('invalid_webauthn_challenge');
    }
    this.challenges.set(persisted.id, persisted);
    const result = super.finishRegistration(args);
    const record = this.credentials.get(result.credentialId);
    await this.repository.createWebAuthnCredential({
      id: record.id,
      userId: record.userId,
      publicKey: publicKeyToSpki(record.publicKey),
      aaguid: record.aaguid,
      signCount: record.signCount,
      backupEligible: record.backupEligible,
      backupState: record.backupState,
      revoked: record.revoked,
      createdAt: record.createdAt,
    });
    if (!await this.repository.consumeWebAuthnChallenge({ id: args.challengeId, now: this.clock() })) throw new Error('invalid_webauthn_challenge');
    return result;
  }

  async beginAuthenticationPersistent(args = {}) {
    const result = super.beginAuthentication(args);
    const challenge = this.challenges.get(result.challengeId);
    await this.repository.createWebAuthnChallenge({
      id: challenge.id,
      userId: challenge.userId,
      kind: challenge.kind,
      challenge: challenge.challenge,
      rpId: this.rpId,
      expiresAt: challenge.expiresAt,
    });
    return result;
  }

  async finishAuthenticationPersistent(args) {
    const persistedChallenge = await this.repository.getWebAuthnChallenge(args.challengeId);
    if (!persistedChallenge || persistedChallenge.kind !== 'authentication' || persistedChallenge.consumed || persistedChallenge.expiresAt <= this.clock()) {
      throw new Error('invalid_webauthn_challenge');
    }
    this.challenges.set(persistedChallenge.id, persistedChallenge);
    const persistedCredential = await this.repository.findWebAuthnCredential(args.credential?.id);
    if (!persistedCredential) throw new Error('unknown_webauthn_credential');
    this.credentials.set(persistedCredential.id, {
      ...persistedCredential,
      publicKey: spkiToPublicKey(persistedCredential.publicKey),
    });
    const result = super.finishAuthentication(args);
    if (!await this.repository.updateWebAuthnSignCount({
      id: result.credentialId,
      signCount: result.signCount,
      now: this.clock(),
      backupState: result.backupState,
    })) throw new Error('sign_count_regression');
    if (!await this.repository.consumeWebAuthnChallenge({ id: args.challengeId, now: this.clock() })) throw new Error('invalid_webauthn_challenge');
    return result;
  }

  async revokeCredentialPersistent(credentialId) {
    return this.repository.revokeWebAuthnCredential(credentialId);
  }

  async listCredentialsPersistent(userId) {
    return this.repository.listWebAuthnCredentials(userId);
  }
}
