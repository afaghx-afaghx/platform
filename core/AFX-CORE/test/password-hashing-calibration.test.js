import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, PASSWORD_HASHING_PROFILE } from '../src/security.js';

const BENCHMARK_ITERATIONS = 5;
const TARGET_MAX_MS = 1000;

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)];
}

test('production password hashing profile is explicit and policy-compliant', () => {
  assert.deepEqual(PASSWORD_HASHING_PROFILE, {
    algorithm: 'scrypt',
    N: 2 ** 15,
    r: 8,
    p: 3,
    keyLength: 32,
    saltBytes: 16,
    targetMaxMs: TARGET_MAX_MS
  });

  const encoded = hashPassword('Correct Horse Battery Staple!');
  assert.match(encoded, /^scrypt\\$32768\\$8\\$3\\$/);
  assert.equal(verifyPassword('Correct Horse Battery Staple!', encoded), true);
  assert.equal(verifyPassword('wrong password', encoded), false);

  const tamperedProfile = encoded.replace('$32768$8$3$', '$65536$8$2$');
  assert.equal(verifyPassword('Correct Horse Battery Staple!', tamperedProfile), false);
});

test('production password hashing calibration remains below one-second target', () => {
  const samples = [];
  for (let i = 0; i < BENCHMARK_ITERATIONS; i += 1) {
    const started = process.hrtime.bigint();
    const encoded = hashPassword(`Calibration Password ${i} - Correct Horse Battery Staple!`);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    assert.equal(verifyPassword(`Calibration Password ${i} - Correct Horse Battery Staple!`, encoded), true);
    samples.push(Number(elapsedMs.toFixed(3)));
  }

  const result = {
    profile: PASSWORD_HASHING_PROFILE,
    iterations: BENCHMARK_ITERATIONS,
    samplesMs: samples,
    medianMs: Number(median(samples).toFixed(3)),
    maxMs: Number(Math.max(...samples).toFixed(3)),
    targetMaxMs: TARGET_MAX_MS,
    pass: Math.max(...samples) < TARGET_MAX_MS
  };

  console.log(`AFX-CORE password hashing calibration: ${JSON.stringify(result)}`);
  assert.ok(result.maxMs < TARGET_MAX_MS, `password hash calibration exceeded ${TARGET_MAX_MS}ms`);
});
