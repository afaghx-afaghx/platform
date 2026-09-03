import { createRemoteJWKSet, jwtVerify, type KeyLike } from 'jose';
import type { AccessTokenClaims } from './contracts';

export type AccessTokenAlgorithm = 'RS256' | 'ES256';

export interface JwksVerifierOptions {
  issuer: string;
  audience: string;
  jwksUrl: URL;
  allowedAlgorithms: readonly AccessTokenAlgorithm[];
  clockToleranceSeconds?: number;
}

export function createJwksVerifier(options: JwksVerifierOptions) {
  if (options.allowedAlgorithms.length === 0) throw new Error('TOKEN_ALGORITHM_POLICY_REQUIRED');
  const keySet = createRemoteJWKSet(options.jwksUrl);

  return async function verify(token: string): Promise<AccessTokenClaims> {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: options.issuer,
      audience: options.audience,
      clockTolerance: options.clockToleranceSeconds ?? 5,
      algorithms: [...options.allowedAlgorithms],
    });
    return payload as unknown as AccessTokenClaims;
  };
}

export interface KeyBinding {
  algorithm: AccessTokenAlgorithm;
  key: KeyLike;
  keyId: string;
}

export interface SigningKeySet {
  active: KeyBinding;
  previous?: readonly KeyBinding[];
}
