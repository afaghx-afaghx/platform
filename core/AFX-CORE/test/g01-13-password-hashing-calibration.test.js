import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { hashPassword, verifyPassword, SECURITY_PARAMETERS } from '../src/security.js';

const PASSWORD = 'Correct Horse Battery Staple!';
const SAMPLES = Number(process.env.G01_13_SAMPLES ?? 8);
const MAX_P95_MS = Number(process.env.G01_13_MAX_P95_MS ?? 1500);

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

test('G01-13 approved scrypt parameters are fixed and measurable', () => {
  const expected = { N: 32768, r: 8, p: 3, keyLength: 32, saltBytes: 16, maxmemBytes: 64 * 1024 * 1024 };
  assert.deepEqual(SECURITY_PARAMETERS.scrypt, expected);
  const timings = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const start = performance.now();
    const encoded = hashPassword(PASSWORD);
    timings.push(performance.now() - start);
    assert.equal(verifyPassword(PASSWORD, encoded), true);
  }
  const p50 = percentile(timings, 0.5); const p95 = percentile(timings, 0.95);
  assert.ok(p95 > 0 && p95 <= MAX_P95_MS, `p95 ${p95.toFixed(2)}ms exceeds ${MAX_P95_MS}ms`);
  process.stdout.write(JSON.stringify({ control: 'G01-13', algorithm: 'scrypt', parameters: expected, samples: timings, p50Ms: Number(p50.toFixed(2)), p95Ms: Number(p95.toFixed(2)), node: process.version }) + '\n');
});

test('G01-13 verification rejects tampered algorithm parameters and malformed sizes', () => {
  const encoded = hashPassword(PASSWORD);
  assert.equal(verifyPassword(PASSWORD, encoded.replace('$32768$', '$65536$')), false);
  assert.equal(verifyPassword(PASSWORD, encoded.replace('$8$', '$4$')), false);
  assert.equal(verifyPassword(PASSWORD, encoded.replace('$3$', '$1$')), false);
  const parts = encoded.split('$');
  parts[4] = Buffer.alloc(8).toString('base64url');
  assert.equal(verifyPassword(PASSWORD, parts.join('$')), false);
  parts[4] = Buffer.alloc(16).toString('base64url');
  parts[5] = Buffer.alloc(31).toString('base64url');
  assert.equal(verifyPassword(PASSWORD, parts.join('$')), false);
});
