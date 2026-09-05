import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { cpus, totalmem } from 'node:os';
import { hashPassword, verifyPassword, SECURITY_PARAMETERS } from '../src/security.js';

const PASSWORD = 'Correct Horse Battery Staple!';
const TARGET_SAMPLES = Number(process.env.G01_13_SAMPLES ?? 8);
const MAX_SINGLE_MS = Number(process.env.G01_13_MAX_SINGLE_MS ?? 1500);
const MAX_CONCURRENCY = Number(process.env.G01_13_MAX_CONCURRENCY ?? 4);

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

function calibrationMetadata() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuCount: cpus().length,
    totalMemoryMiB: Math.round(totalmem() / 1024 / 1024),
    scrypt: SECURITY_PARAMETERS.scrypt,
  };
}

test('G01-13 scrypt production calibration baseline is measurable and bounded', async () => {
  assert.equal(SECURITY_PARAMETERS.scrypt.N, 2 ** 17);
  assert.equal(SECURITY_PARAMETERS.scrypt.r, 8);
  assert.equal(SECURITY_PARAMETERS.scrypt.p, 3);
  assert.equal(SECURITY_PARAMETERS.scrypt.keyLength, 32);
  assert.equal(SECURITY_PARAMETERS.scrypt.maxmemBytes, 256 * 1024 * 1024);

  const samples = [];
  for (let i = 0; i < TARGET_SAMPLES; i += 1) {
    const started = performance.now();
    const encoded = hashPassword(PASSWORD);
    const elapsed = performance.now() - started;
    samples.push(elapsed);
    assert.equal(verifyPassword(PASSWORD, encoded), true);
  }

  const p50 = percentile(samples, 0.50);
  const p95 = percentile(samples, 0.95);
  const peakMemoryMiB = (SECURITY_PARAMETERS.scrypt.N * 128 * SECURITY_PARAMETERS.scrypt.r) / 1024 / 1024;

  assert.ok(Number.isFinite(p95) && p95 > 0, 'calibration must produce timing evidence');
  assert.ok(peakMemoryMiB <= 128, `scrypt peak working memory must stay within bounded cost: ${peakMemoryMiB.toFixed(2)} MiB`);
  assert.ok(p95 <= MAX_SINGLE_MS, `p95 password-hash latency ${p95.toFixed(2)}ms exceeds ${MAX_SINGLE_MS}ms calibration ceiling`);

  const concurrency = Math.min(MAX_CONCURRENCY, Math.max(1, cpus().length));
  const concurrentStarted = performance.now();
  const hashes = await Promise.all(Array.from({ length: concurrency }, () => Promise.resolve().then(() => hashPassword(PASSWORD))));
  const wallMs = performance.now() - concurrentStarted;

  assert.equal(hashes.length, concurrency);
  assert.equal(new Set(hashes).size, concurrency);
  assert.ok(hashes.every((hash) => verifyPassword(PASSWORD, hash)));
  assert.ok(wallMs > 0);

  process.stdout.write(JSON.stringify({
    control: 'G01-13',
    decision: 'retain-scrypt-reviewed-equivalent-pending-production-hardware-confirmation',
    metadata: calibrationMetadata(),
    samples,
    p50Ms: Number(p50.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    concurrentWorkers: concurrency,
    concurrentWallMs: Number(wallMs.toFixed(2)),
    peakWorkingMemoryMiB: Number(peakMemoryMiB.toFixed(2)),
    maxmemMiB: 256,
    thresholds: { maxSingleMs: MAX_SINGLE_MS, maxConcurrency: MAX_CONCURRENCY },
  }) + '\n');
});
