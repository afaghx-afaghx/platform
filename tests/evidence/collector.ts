import { writeFileSync } from 'node:fs';

export type TestEvidence = {
  schemaVersion: 'v1';
  commit: string;
  startedAt: string;
  finishedAt: string;
  status: 'passed' | 'failed' | 'blocked';
  tests: { total: number; passed: number; failed: number; skipped: number };
  coverage?: Record<string, unknown>;
};

export function collectEvidence(input: Omit<TestEvidence, 'schemaVersion'>, outputPath: string) {
  const evidence: TestEvidence = { schemaVersion: 'v1', ...input };
  if (evidence.tests.passed + evidence.tests.failed + evidence.tests.skipped !== evidence.tests.total) {
    throw new Error('test_counts_inconsistent');
  }
  writeFileSync(outputPath, JSON.stringify(evidence, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  return evidence;
}
