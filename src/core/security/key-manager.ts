import { Injectable } from '@nestjs/common';
import { exportJWK, importSPKI, KeyLike } from 'jose';

export type SigningKey = { kid: string; algorithm: 'RS256'; publicKey: KeyLike; status: 'ACTIVE' | 'VERIFY_ONLY' };

/**
 * KMS/HSM-ready boundary. Production private signing operations must be delegated
 * to the configured provider; private key material must not be persisted in Git.
 */
export interface SigningKeyProvider {
  sign(payload: Uint8Array, kid: string): Promise<Uint8Array>;
  publicKeys(): Promise<SigningKey[]>;
}

@Injectable()
export class KeyManager {
  private readonly keys = new Map<string, SigningKey>();

  async registerPublicKey(kid: string, publicPem: string, status: SigningKey['status'] = 'ACTIVE'): Promise<void> {
    if (!/^[-A-Za-z0-9_]{1,64}$/.test(kid)) throw new Error('invalid_kid');
    const publicKey = await importSPKI(publicPem.replace(/\\n/g, '\n'), 'RS256');
    this.keys.set(kid, { kid, algorithm: 'RS256', publicKey, status });
  }

  async jwks(): Promise<{ keys: Record<string, unknown>[] }> {
    const keys: Record<string, unknown>[] = [];
    for (const key of this.keys.values()) {
      const jwk = await exportJWK(key.publicKey);
      keys.push({ ...jwk, kid: key.kid, alg: key.algorithm, use: 'sig' });
    }
    return { keys };
  }

  activeKid(): string {
    const active = [...this.keys.values()].find((key) => key.status === 'ACTIVE');
    if (!active) throw new Error('no_active_signing_key');
    return active.kid;
  }
}
