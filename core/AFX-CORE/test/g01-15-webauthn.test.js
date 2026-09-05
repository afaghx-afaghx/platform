import test from 'node:test';
import assert from 'node:assert/strict';
import { WebAuthnService, WEBAUTHN_PARAMETERS } from '../src/webauthn.js';

const ORIGIN = 'https://login.afaghx.test';
const RP_ID = 'afaghx.test';

function service(clock = () => 1_700_000_000_000) {
  return new WebAuthnService({ rpId: RP_ID, origins: [ORIGIN], clock });
}

test('G01-15 policy requires a valid HTTPS origin scoped to RP ID', () => {
  assert.throws(() => new WebAuthnService({ rpId: RP_ID, origins: ['https://evil.example'] }), /invalid_webauthn_origin_policy/);
  assert.throws(() => new WebAuthnService({ rpId: RP_ID, origins: ['http://example.com'] }), /invalid_origin/);
  const s = service();
  assert.equal(s.rpId, RP_ID);
  assert.deepEqual([...s.origins], [ORIGIN]);
});

test('G01-15 registration options are passkey-scoped and user-verification required', () => {
  const s = service();
  const result = s.beginRegistration({ userId: 'usr_1', userName: 'admin@afaghx.test', displayName: 'Admin' });
  assert.equal(result.publicKey.rp.id, RP_ID);
  assert.equal(result.publicKey.attestation, 'none');
  assert.equal(result.publicKey.authenticatorSelection.residentKey, 'required');
  assert.equal(result.publicKey.authenticatorSelection.userVerification, 'required');
  assert.deepEqual(result.publicKey.pubKeyCredParams, [{ type: 'public-key', alg: -7 }]);
});

test('G01-15 authentication challenge is one-time and expires', () => {
  let now = 1_700_000_000_000;
  const s = service(() => now);
  const { challengeId, publicKey } = s.beginAuthentication({ userId: 'usr_1' });
  assert.match(publicKey.challenge, /^[A-Za-z0-9_-]{43}$/);
  assert.throws(() => s.finishAuthentication({ challengeId, userId: 'usr_1', origin: ORIGIN, credential: {} }), /invalid_authentication_response/);
  now += WEBAUTHN_PARAMETERS.challengeTtlMs + 1;
  assert.throws(() => s.finishAuthentication({ challengeId, userId: 'usr_1', origin: ORIGIN, credential: {} }), /invalid_authentication_response/);
});

test('G01-15 credential revocation and listing are explicit lifecycle operations', () => {
  const s = service();
  assert.deepEqual(s.listCredentials('usr_1'), []);
  assert.equal(s.revokeCredential('missing'), false);
  assert.throws(() => s.finishRegistration({ userId: 'usr_1', challengeId: 'missing', origin: ORIGIN, credential: {} }), /invalid_registration_response/);
});
