import { performance } from 'node:perf_hooks';
import { hashPassword } from '../src/security.js';

const samples = Number(process.env.SCRYPT_BENCHMARK_SAMPLES ?? 7);
if (!Number.isInteger(samples) || samples < 3 || samples > 50) {
  throw new Error('invalid_SCRYPT_BENCHMARK_SAMPLES');
}

const password = 'AFX-CORE benchmark password 2026!';
const timings = [];

for (let i = 0; i < samples; i += 1) {
  const started = performance.now();
  hashPassword(password);
  timings.push(performance.now() - started);
}

timings.sort((a, b) => a - b);
const median = timings[Math.floor(timings.length / 2)];
const p95 = timings[Math.min(timings.length - 1, Math.ceil(timings.length * 0.95) - 1)];

const evidence = {
  control: 'G01-13',
  algorithm: 'scrypt',
  parameters: { N: 2 ** 15, r: 8, p: 3, keyLength: 32 },
  node: process.version,
  samples,
  median_ms: Number(median.toFixed(2)),
  p95_ms: Number(p95.toFixed(2)),
  timings_ms: timings.map((value) => Number(value.toFixed(2))),
  generated_at: new Date().toISOString()
};

console.log(JSON.stringify(evidence, null, 2));
