import test from 'node:test';
import assert from 'node:assert/strict';
import { KmsKeyManager, WorkloadIdentityVerifier, constantTimeEqual } from '../src/security-boundary.js';

class FakeKms {
  constructor() { this.version = 1; }
  async encrypt({ keyAlias, plaintext }) { return { keyAlias, ciphertext: Buffer.from(String(plaintext)).toString('base64'), keyVersion: this.version }; }
  async decrypt({ ciphertext }) { return Buffer.from(ciphertext, 'base64').toString(); }
  async getCurrentKeyVersion() { return this.version; }
  async rotate() { this.version += 1; return { keyVersion: this.version }; }
  async revoke({ keyVersion }) { return { revoked: keyVersion }; }
}

test('G01-20 KMS contract requires versioned encryption and supports rotation/revocation', async () => {
  const kms = new KmsKeyManager(new FakeKms());
  assert.equal((await kms.currentKeyVersion()), 1);
  const encrypted = await kms.encrypt('test-secret');
  assert.equal(encrypted.keyVersion, 1);
  assert.equal(await kms.decrypt(encrypted.ciphertext), 'test-secret');
  assert.equal((await kms.rotate()).keyVersion, 2);
  assert.deepEqual(await kms.revoke(1), { revoked: 1 });
});

test('G01-20 rejects a provider that cannot prove key version', async () => {
  const provider = { encrypt: async () => ({ ciphertext: 'x' }), decrypt: async () => 'x', getCurrentKeyVersion: async () => 1 };
  const kms = new KmsKeyManager(provider);
  await assert.rejects(() => kms.encrypt('secret'), /kms_key_version_required/);
});

test('G01-21 workload identity is deny-by-default for issuer, audience and lifetime', () => {
  const verifier = new WorkloadIdentityVerifier({ issuer: 'https://issuer.example', audience: 'afx-core', clock: () => 1_700_000_000_000 });
  const valid = verifier.verifyClaims({ iss: 'https://issuer.example', aud: 'afx-core', sub: 'svc.orders', iat: 1_699_999_900, exp: 1_700_000_000 });
  assert.equal(valid.subject, 'svc.orders');
  assert.throws(() => verifier.verifyClaims({ iss: 'wrong', aud: 'afx-core', sub: 'svc.orders', iat: 1_699_999_900, exp: 1_700_000_000 }), /invalid_workload_identity/);
  assert.throws(() => verifier.verifyClaims({ iss: 'https://issuer.example', aud: 'afx-core', sub: 'svc.orders', iat: 1_699_999_000, exp: 1_700_000_000 }), /invalid_workload_lifetime/);
});

test('G01-21 rejects missing workload subject', () => {
  const verifier = new WorkloadIdentityVerifier({ issuer: 'i', audience: 'a', clock: () => 1_000_000 });
  assert.throws(() => verifier.verifyClaims({ iss: 'i', aud: 'a', iat: 900, exp: 1000 }), /workload_subject_required/);
});

test('G01-22 constant-time helper never treats different lengths as equal', () => {
  assert.equal(constantTimeEqual('abc', 'abc'), true);
  assert.equal(constantTimeEqual('abc', 'abd'), false);
  assert.equal(constantTimeEqual('abc', 'ab'), false);
});
