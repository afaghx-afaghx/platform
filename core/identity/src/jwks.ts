import { createRemoteJWKSet, jwtVerify, type KeyLike } from 'jose';
import type { AccessTokenClaims } from './contracts';

export interface JwksVerifierOptions {
  issuer: string;
  audience: string;
  jwksUrl: URL;
  clockToleranceSeconds?: number;
  allowedAlgorithms?: readonly ('RS256' | 'ES256')[];
}

/** Remote JWKS verification with issuer/audience validation and an explicit algorithm policy. */
export function createJwksVerifier(options: JwksVerifierOptions) {
  const keySet = createRemoteJWKSet(options.jwksUrl);
  const algorithms = options.allowedAlgorithms ?? ['RS256', 'ES256'];

  return async function verify(token: string): Promise<AccessTokenClaims> {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: options.issuer,
      audience: options.audience,
      clockTolerance: options.clockToleranceSeconds ?? 5,
      algorithms: [...algorithms],
    });
    return payload as unknown as AccessTokenClaims;
  };
}

export interface KeyBinding {
  algorithm: 'RS256' | 'ES256';
  key: KeyLike;
  keyId: string;
}

/** Runtime configuration contract for controlled signing-key rotation. */
export interface SigningKeySet {
  active: KeyBinding;
  previous?: readonly KeyBinding[];
}
