import { Injectable } from '@nestjs/common';
import { exportJWK, importSPKI, JWK } from 'jose';

type RawPublicKey = { kid: string; publicKey: string };

@Injectable()
export class JwksService {
  private cached?: JWK[];

  async getJwks(): Promise<{ keys: JWK[] }> {
    if (this.cached) return { keys: this.cached };
    const keys = await this.loadPublicKeys();
    this.cached = await Promise.all(keys.map(async ({ kid, publicKey }) => ({
      ...(await exportJWK(await importSPKI(publicKey.replace(/\\n/g, '\n'), 'RS256'))),
      alg: 'RS256',
      use: 'sig',
      kid,
    })));
    return { keys: this.cached };
  }

  private async loadPublicKeys(): Promise<RawPublicKey[]> {
    const raw = process.env.AUTH_JWT_PUBLIC_KEYS_JSON;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
        const keys = parsed as RawPublicKey[];
        if (keys.some((key) => !key?.kid || !key.publicKey)) throw new Error();
        return keys;
      } catch {
        throw new Error('AUTH_JWT_PUBLIC_KEYS_JSON is invalid');
      }
    }
    const pem = process.env.AUTH_JWT_PUBLIC_KEY;
    const kid = process.env.AUTH_JWT_KID ?? 'v1';
    if (!pem || pem.includes('REPLACE_WITH')) throw new Error('JWT public key is not configured');
    return [{ kid, publicKey: pem }];
  }
}
