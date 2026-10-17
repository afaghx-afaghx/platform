import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { canonicalJson, evaluateEvidence, validatePolicy } from './four-protocol-quality-gate.mjs';

const policy = JSON.parse(await readFile(new URL('../controls/four-protocol-quality-gate.json', import.meta.url), 'utf8'));
const candidateSha = 'a'.repeat(40);
const artifactHash = 'b'.repeat(64);
const now = new Date('2026-10-17T18:00:00.000Z');

function makeTrustRegistry() {
  const keys = [];
  const roles = new Set(policy.protocols.flatMap(p => p.controls.flatMap(c => c.allowed_verifier_roles)));
  for (const role of roles) {
    const pair = generateKeyPairSync('ed25519');
    keys.push({ id: `test-${role}`, role, public_key_pem: pair.publicKey.export({ type: 'spki', format: 'pem' }), privateKey: pair.privateKey, can_sign_envelope: false, independent: role === 'independent-reviewer' || role === 'human-reviewer' || role === 'security-reviewer' || role === 'architecture-reviewer' });
  }
  const pair = generateKeyPairSync('ed25519');
  keys.push({ id: 'test-envelope-signer', role: 'evidence-envelope-signer', public_key_pem: pair.publicKey.export({ type: 'spki', format: 'pem' }), privateKey: pair.privateKey, can_sign_envelope: true, independent: true });
  return { registry: keys.map(({ privateKey, ...key }) => key), privateKeys: new Map(keys.map(key => [key.id, key.privateKey])) };
}

function signedEnvelope(trust, { partialControl = null, overrides = {} } = {}) {
  const timestamp = now.toISOString();
  const results = policy.protocols.flatMap(protocol => protocol.controls.map(control => {
    const verifier = trust.registry.find(v => !v.can_sign_envelope && v.role === control.allowed_verifier_roles[0]);
    return {
      control_id: control.id,
      status: control.id === partialControl ? 'PARTIAL' : 'PASS',
      source_sha: candidateSha,
      observed_at: timestamp,
      verified_by: verifier.id,
      evidence: {
        kind: control.allowed_evidence_kinds[0],
        uri: 'https://github.com/afaghx-afaghx/platform/actions/runs/123456789',
        sha256: artifactHash,
        digest_verified: true,
        source_system: 'GitHub Actions',
        reference_id: `test-ref-${control.id}`,
        source_sha: candidateSha,
        captured_at: timestamp,
        verification_method: `verified fixture for ${control.id}`,
        exit_code: 0,
        mocked: false
      }
    };
  }));
  const envelope = {
    schema_version: 'AFX-EVIDENCE-ENVELOPE-1.0.0',
    run_id: 'test-run-2026-10-17',
    created_at: timestamp,
    expires_at: '2026-10-17T19:00:00.000Z',
    subject: { repository: policy.repository, commit_sha: candidateSha, deployed_sha: candidateSha, environment: 'production' },
    results,
    ...overrides
  };
  const core = structuredClone(envelope);
  envelope.integrity = { sha256: createHash('sha256').update(canonicalJson(core)).digest('hex') };
  const toSign = Buffer.from(canonicalJson({ core, integrity: envelope.integrity }), 'utf8');
  envelope.signature = { algorithm: 'Ed25519', key_id: 'test-envelope-signer', value: sign(null, toSign, trust.privateKeys.get('test-envelope-signer')).toString('base64') };
  return envelope;
}

function evaluate(envelope, trustRegistry, expectedSha = candidateSha) {
  return evaluateEvidence({ policy, envelope, expectedSha, trustedVerifiers: trustRegistry, now });
}

function reseal(envelope, trust) {
  const core = { ...envelope };
  delete core.integrity;
  delete core.signature;
  envelope.integrity = { sha256: createHash('sha256').update(canonicalJson(core)).digest('hex') };
  const toSign = Buffer.from(canonicalJson({ core, integrity: envelope.integrity }), 'utf8');
  envelope.signature = { algorithm: 'Ed25519', key_id: 'test-envelope-signer', value: sign(null, toSign, trust.privateKeys.get('test-envelope-signer')).toString('base64') };
  return envelope;
}

test('policy defines exactly four complete protocols, 40 unique controls, and a 9.5/10 floor', () => {
  const result = validatePolicy(policy);
  assert.equal(result.valid, true, result.errors.join(', '));
  assert.equal(result.protocol_count, 4);
  assert.equal(result.control_count, 40);
  assert.equal(policy.release_floor, 9.5);
  assert.equal(policy.protocol_floor, 9.5);
});

test('missing trusted registry fails closed and never invents a score', () => {
  const trust = makeTrustRegistry();
  const result = evaluate(signedEnvelope(trust), []);
  assert.equal(result.state, 'RED');
  assert.equal(result.score, null);
  assert.ok(result.blockers.includes('TRUSTED_VERIFIER_REGISTRY_EMPTY'));
});

test('fully signed, fresh, exact-SHA evidence reaches PROVEN only with trusted verifiers', () => {
  const trust = makeTrustRegistry();
  const result = evaluate(signedEnvelope(trust), trust.registry);
  assert.equal(result.state, 'PROVEN', JSON.stringify(result.blockers));
  assert.equal(result.release_eligible, true);
  assert.equal(result.score, 10);
  assert.ok(result.protocols.every(p => p.score === 10 && p.state === 'GREEN'));
});

test('one partial non-critical control yields 9.5 for its protocol only when all hard gates pass', () => {
  const trust = makeTrustRegistry();
  const nonCritical = policy.protocols.flatMap(p => p.controls).find(c => !c.critical);
  const result = evaluate(signedEnvelope(trust, { partialControl: nonCritical.id }), trust.registry);
  assert.equal(result.protocols.find(p => p.id === nonCritical.id.slice(0, 2)).score, 9.5);
  assert.equal(result.score >= 9.5, true);
  assert.equal(result.state, 'PROVEN', JSON.stringify(result.blockers));
});

test('critical PARTIAL fails closed even when aggregate score remains above 9.5', () => {
  const trust = makeTrustRegistry();
  const critical = policy.protocols.flatMap(p => p.controls).find(c => c.critical);
  const result = evaluate(signedEnvelope(trust, { partialControl: critical.id }), trust.registry);
  assert.equal(result.state, 'RED');
  assert.equal(result.release_eligible, false);
  assert.ok(result.blockers.some(b => b.startsWith(`${critical.id}:`)));
});

test('two partial controls in one protocol breach the 9.5 protocol floor', () => {
  const trust = makeTrustRegistry();
  const candidates = policy.protocols[0].controls.filter(c => !c.critical).slice(0, 2);
  assert.equal(candidates.length, 2);
  const envelope = signedEnvelope(trust);
  for (const result of envelope.results) if (candidates.some(c => c.id === result.control_id)) result.status = 'PARTIAL';
  const result = evaluate(reseal(envelope, trust), trust.registry);
  assert.equal(result.state, 'RED');
  assert.ok(result.protocols.find(p => p.id === 'P1').score < 9.5);
});

test('stale evidence fails closed', () => {
  const trust = makeTrustRegistry();
  const envelope = signedEnvelope(trust);
  const record = envelope.results.find(r => r.control_id === 'P4-01');
  record.observed_at = '2026-10-17T17:00:00.000Z';
  record.evidence.captured_at = '2026-10-17T17:00:00.000Z';
  const result = evaluate(reseal(envelope, trust), trust.registry);
  assert.equal(result.state, 'RED');
  assert.ok(result.blockers.some(b => b.startsWith('P4-01:')));
});

test('candidate SHA mismatch fails closed before scoring', () => {
  const trust = makeTrustRegistry();
  const result = evaluate(signedEnvelope(trust), trust.registry, 'c'.repeat(40));
  assert.equal(result.state, 'RED');
  assert.equal(result.score, null);
  assert.ok(result.blockers.includes('CANDIDATE_SHA_MISMATCH'));
});

test('tampered evidence envelope fails the integrity check', () => {
  const trust = makeTrustRegistry();
  const envelope = signedEnvelope(trust);
  envelope.results[0].evidence.uri = 'https://attacker.example/evidence';
  const result = evaluate(envelope, trust.registry);
  assert.equal(result.state, 'RED');
  assert.equal(result.score, null);
  assert.ok(result.blockers.includes('ENVELOPE_INTEGRITY_MISMATCH'));
});

test('wrong signature is rejected even when the content digest is correct', () => {
  const trust = makeTrustRegistry();
  const envelope = signedEnvelope(trust);
  envelope.signature.value = Buffer.from('invalid signature').toString('base64');
  const result = evaluate(envelope, trust.registry);
  assert.equal(result.state, 'RED');
  assert.equal(result.score, null);
  assert.ok(result.blockers.includes('ENVELOPE_SIGNATURE_VERIFICATION_FAILED'));
});

test('missing control evidence cannot be hidden by high scores in other protocols', () => {
  const trust = makeTrustRegistry();
  const envelope = signedEnvelope(trust);
  envelope.results = envelope.results.filter(r => r.control_id !== 'P4-01');
  const result = evaluate(reseal(envelope, trust), trust.registry);
  assert.equal(result.state, 'RED');
  assert.ok(result.blockers.includes('P4-01:CONTROL_RESULT_MISSING'));
});

test('unverified artifact digest fails closed even when the envelope is validly signed', () => {
  const trust = makeTrustRegistry();
  const envelope = signedEnvelope(trust);
  envelope.results[0].evidence.digest_verified = false;
  const result = evaluate(reseal(envelope, trust), trust.registry);
  assert.equal(result.state, 'RED');
  assert.ok(result.blockers.some(b => b.endsWith(':ARTIFACT_DIGEST_NOT_VERIFIED')));
});

test('expired envelope fails closed', () => {
  const trust = makeTrustRegistry();
  const envelope = signedEnvelope(trust);
  envelope.expires_at = '2026-10-17T17:59:59.000Z';
  const result = evaluate(reseal(envelope, trust), trust.registry);
  assert.equal(result.state, 'RED');
  assert.equal(result.score, null);
  assert.ok(result.blockers.includes('ENVELOPE_EXPIRED'));
});

test('mocked or undeclared evidence is rejected', () => {
  const trust = makeTrustRegistry();
  const envelope = signedEnvelope(trust);
  envelope.results[0].evidence.mocked = true;
  const result = evaluate(reseal(envelope, trust), trust.registry);
  assert.equal(result.state, 'RED');
  assert.ok(result.blockers.some(b => b.endsWith(':MOCKED_OR_UNDECLARED_EVIDENCE')));
});
