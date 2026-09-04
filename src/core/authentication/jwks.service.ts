import { Injectable } from '@nestjs/common';
import { exportJWK, importSPKI, JWK } from 'jose';

@Injectable()
export class JwksService {
  private cached?: JWK;

  async getJwks(): Promise<{ keys: JWK[] }> {
    if (!this.cached) {
      const pem = process.env.AUTH_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
      if (!pem || pem.includes('REPLACE_WITH')) throw new Error('JWT public key is not configured');
      const key = await importSPKI(pem, 'RS256');
      this.cached = { ...(await exportJWK(key)), alg: 'RS256', use: 'sig', kid: process.env.AUTH_JWT_KID ?? 'v1' };
    }
    return { keys: [this.cached] };
  }
}
