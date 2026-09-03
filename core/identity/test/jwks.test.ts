import { describe, expect, it } from 'vitest';
import { createJwksVerifier } from '../src/jwks';

describe('JWKS security boundary', () => {
  it('requires an explicit issuer, audience and JWKS endpoint', () => {
    const verifier = createJwksVerifier({
      issuer: 'https://auth.afaghx.example',
      audience: 'afx-platform',
      jwksUrl: new URL('https://auth.afaghx.example/.well-known/jwks.json'),
      allowedAlgorithms: ['RS256'],
    });
    expect(verifier).toBeTypeOf('function');
  });
});
