import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { hashPassword, SECURITY_PARAMETERS } from '../src/security.js';

test('password hashing parameters are explicit and benchmarkable', () => {
  assert.equal(SECURITY_PARAMETERS.scrypt.N, 2 ** 15);
  assert.equal(SECURITY_PARAMETERS.scrypt.r, 8);
  assert.equal(SECURITY_PARAMETERS.scrypt.p, 3);
  assert.equal(SECURITY_PARAMETERS.scrypt.keyLength, 32);
  const samples = [];
  for (let i = 0; i < 5; i += 1) {
    const started = performance.now();
    hashPassword('Correct Horse Battery Staple!');
    samples.push(performance.now() - started);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const medianMs = sorted[Math.floor(sorted.length / 2)];
  const maxMs = Math.max(...samples);
  console.log(JSON.stringify({
    algorithm: 'scrypt',
    N: SECURITY_PARAMETERS.scrypt.N,
    r: SECURITY_PARAMETERS.scrypt.r,
    p: SECURITY_PARAMETERS.scrypt.p,
    keyLength: SECURITY_PARAMETERS.scrypt.keyLength,
    samplesMs: samples.map(value => Number(value.toFixed(2))),
    medianMs: Number(medianMs.toFixed(2)),
    maxMs: Number(maxMs.toFixed(2))
  }));
  assert.ok(maxMs < 5000, `hash benchmark exceeded 5s: ${maxMs.toFixed(2)}ms`);
});
