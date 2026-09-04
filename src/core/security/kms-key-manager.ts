import { Injectable } from '@nestjs/common';
import { GetPublicKeyCommand, KMSClient, SignCommand } from '@aws-sdk/client-kms';
import { exportJWK, importSPKI, KeyLike } from 'jose';
import { createHash } from 'node:crypto';

export type KmsKeyStatus = 'ACTIVE' | 'VERIFY_ONLY';
export type KmsKeyConfig = { kid: string; keyId: string; status: KmsKeyStatus };

type LoadedKey = KmsKeyConfig & { publicKey: KeyLike };

/**
 * Production signer: private key material never enters the process. AWS KMS performs
 * RSASSA-PKCS1-v1_5-SHA-256 signing; verification uses public keys published as JWKS.
 * Rotation is overlap-based: one ACTIVE key signs while VERIFY_ONLY keys remain valid.
 */
@Injectable()
export class KmsKeyManager {
  private readonly client = new KMSClient({ region: process.env.AWS_REGION });
  private readonly keys = new Map<string, LoadedKey>();
  private initialized?: Promise<void>;

  async initialize(): Promise<void> {
    if (this.initialized) return this.initialized;
    this.initialized = this.loadKeys();
    return this.initialized;
  }

  private async loadKeys(): Promise<void> {
    const raw = process.env.AUTH_KMS_KEYS_JSON;
    if (!raw) throw new Error('AUTH_KMS_KEYS_JSON is required for KMS signing');
    const configs = JSON.parse(raw) as KmsKeyConfig[];
    if (!Array.isArray(configs) || configs.length === 0) throw new Error('AUTH_KMS_KEYS_JSON must contain keys');
    const active = configs.filter((k) => k.status === 'ACTIVE');
    if (active.length !== 1) throw new Error('exactly_one_active_kms_key_required');
    for (const config of configs) {
      if (!/^[-A-Za-z0-9_]{1,64}$/.test(config.kid) || !config.keyId) throw new Error('invalid_kms_key_config');
      const result = await this.client.send(new GetPublicKeyCommand({ KeyId: config.keyId }));
      if (!result.PublicKey) throw new Error(`kms_public_key_unavailable:${config.kid}`);
      const pem = this.derToPem(result.PublicKey);
      const publicKey = await importSPKI(pem, 'RS256');
      this.keys.set(config.kid, { ...config, publicKey });
    }
  }

  async sign(signingInput: Uint8Array): Promise<{ kid: string; signature: Uint8Array }> {
    await this.initialize();
    const active = [...this.keys.values()].find((key) => key.status === 'ACTIVE');
    if (!active) throw new Error('no_active_kms_signing_key');
    const digest = createHash('sha256').update(signingInput).digest();
    const result = await this.client.send(new SignCommand({
      KeyId: active.keyId,
      Message: digest,
      MessageType: 'DIGEST',
      SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
    }));
    if (!result.Signature) throw new Error('kms_sign_failed');
    return { kid: active.kid, signature: new Uint8Array(result.Signature) };
  }

  async publicKey(kid: string): Promise<KeyLike> {
    await this.initialize();
    const key = this.keys.get(kid);
    if (!key) throw new Error('unknown_kid');
    return key.publicKey;
  }

  async jwks(): Promise<{ keys: Record<string, unknown>[] }> {
    await this.initialize();
    const keys: Record<string, unknown>[] = [];
    for (const key of this.keys.values()) {
      const jwk = await exportJWK(key.publicKey);
      keys.push({ ...jwk, kid: key.kid, alg: 'RS256', use: 'sig' });
    }
    return { keys };
  }

  private derToPem(der: Uint8Array): string {
    const b64 = Buffer.from(der).toString('base64').match(/.{1,64}/g)?.join('\n') ?? '';
    return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
  }
}
