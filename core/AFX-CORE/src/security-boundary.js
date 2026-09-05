import { createHash, timingSafeEqual } from 'node:crypto';

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export class KmsKeyManager {
  constructor(provider, { keyAlias = 'afx-core', requireVersionedKeys = true } = {}) {
    if (!provider || typeof provider.encrypt !== 'function' || typeof provider.decrypt !== 'function' || typeof provider.getCurrentKeyVersion !== 'function') {
      throw new Error('invalid_kms_provider');
    }
    this.provider = provider;
    this.keyAlias = keyAlias;
    this.requireVersionedKeys = requireVersionedKeys;
  }

  async encrypt(plaintext, aad = '') {
    const result = await this.provider.encrypt({ keyAlias: this.keyAlias, plaintext, aad });
    if (this.requireVersionedKeys && !result?.keyVersion) throw new Error('kms_key_version_required');
    return result;
  }

  async decrypt(ciphertext, aad = '') {
    return this.provider.decrypt({ keyAlias: this.keyAlias, ciphertext, aad });
  }

  async currentKeyVersion() {
    return this.provider.getCurrentKeyVersion({ keyAlias: this.keyAlias });
  }

  async rotate() {
    if (typeof this.provider.rotate !== 'function') throw new Error('kms_rotation_not_supported');
    const result = await this.provider.rotate({ keyAlias: this.keyAlias });
    if (!result?.keyVersion) throw new Error('kms_rotation_version_required');
    return result;
  }

  async revoke(version) {
    if (typeof this.provider.revoke !== 'function') throw new Error('kms_revocation_not_supported');
    return this.provider.revoke({ keyAlias: this.keyAlias, keyVersion: version });
  }
}

export class WorkloadIdentityVerifier {
  constructor({ issuer, audience, clock = () => Date.now(), maxLifetimeSeconds = 300 }) {
    if (!issuer || !audience) throw new Error('workload_identity_policy_required');
    this.issuer = issuer;
    this.audience = audience;
    this.clock = clock;
    this.maxLifetimeSeconds = maxLifetimeSeconds;
  }

  verifyClaims(claims) {
    if (!claims || claims.iss !== this.issuer || claims.aud !== this.audience) throw new Error('invalid_workload_identity');
    if (!claims.sub || typeof claims.sub !== 'string') throw new Error('workload_subject_required');
    if (!Number.isFinite(claims.exp) || !Number.isFinite(claims.iat)) throw new Error('workload_lifetime_required');
    const now = Math.floor(this.clock() / 1000);
    if (claims.exp <= now || claims.iat > now + 30 || claims.exp - claims.iat > this.maxLifetimeSeconds) throw new Error('invalid_workload_lifetime');
    return { subject: claims.sub, issuer: claims.iss, audience: claims.aud };
  }
}

export function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}
