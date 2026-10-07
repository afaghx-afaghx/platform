import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { hashPassword, SECURITY_PARAMETERS } from '../src/security.js';

test('production password hashing calibration stays below one second per hash', () => {
  assert.equal(SECURITY_PARAMETERS.scrypt.N, 2 ** 15);
  assert.equal(SECURITY_PARAMETERS.scrypt.r, 8);
  assert.equal(SECURITY_PARAMETERS.scrypt.p, 3);
  assert.equal(SECURITY_PARAMETERS.scrypt.keyLength, 32);

  const samples = 8;
  const timings = [];
  for (let index = 0; index < samples; index += 1) {
    const started = performance.now();
    hashPassword('Correct Horse Battery Staple!');
    timings.push(performance.now() - started);
  }

  timings.sort((a, b) => a - b);
  const averageMs = timings.reduce((sum, value) => sum + value, 0) / samples;
  const p95Ms = timings[Math.ceil(samples * 0.95) - 1];

  console.log(JSON.stringify({
    node: process.version,
    samples,
    parameters: SECURITY_PARAMETERS.scrypt,
    timingsMs: timings.map(value => Number(value.toFixed(2))),
    averageMs: Number(averageMs.toFixed(2)),
    p95Ms: Number(p95Ms.toFixed(2)),
    target: '< 1000ms/hash'
  }));

  assert.ok(p95Ms < 1000, 'scrypt p95 ' + p95Ms.toFixed(2) + 'ms exceeds 1000ms');
});