import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const repoRoot = resolve(import.meta.dirname, '../..');
export function repoPath(path: string) { return resolve(repoRoot, path); }
export function fileExists(path: string) { return existsSync(repoPath(path)); }
export function readRepoFile(path: string) { return readFileSync(repoPath(path), 'utf8'); }

export function assertNoPattern(content: string, pattern: RegExp, label: string) {
  if (pattern.test(content)) throw new Error('Forbidden ' + label + ' detected');
}
