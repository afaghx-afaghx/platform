import { randomBytes, createHash, argon2Sync, timingSafeEqual } from 'node:crypto';

// G01-13 production password hashing baseline: Argon2id.
// Parameters are explicit and must be re-calibrated on production hardware before closure.
const ARGON2_MEMORY_KIB = 64 * 1024;
const ARGON2_PASSES = 3;
const ARGON2_PARALLELISM = 4;
const ARGON2_TAG_LEN = 32;
const ARGON2_VERSION = 19;
const TOKEN_BYTES = 32;

export function normalizeEmail(email) {
  if (typeof email !== 'string') throw new Error('invalid_email');
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('invalid_email');
  return value;
}
export function randomToken() { return randomBytes(TOKEN_BYTES).toString('base64url'); }
export function tokenDigest(token) { return createHash('sha256').update(token, 'utf8').digest('base64url'); }
export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('weak_password');
  const salt = randomBytes(16);
  const derived = argon2Sync('argon2id', {
    message: password,
    nonce: salt,
    parallelism: ARGON2_PARALLELISM,
    tagLength: ARGON2_TAG_LEN,
    memory: ARGON2_MEMORY_KIB,
    passes: ARGON2_PASSES,
  });
  return `argon2id$v=${ARGON2_VERSION}$m=${ARGON2_MEMORY_KIB}$t=${ARGON2_PASSES}$p=${ARGON2_PARALLELISM}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}
export function verifyPassword(password, encoded) {
  try {
    const [algorithm, version, memory, passes, parallelism, salt64, hash64] = encoded.split('$');
    if (algorithm !== 'argon2id' || version !== `v=${ARGON2_VERSION}`) return false;
    const memoryKib = Number(memory?.slice(2));
    const passCount = Number(passes?.slice(2));
    const lanes = Number(parallelism?.slice(2));
    if (!Number.isInteger(memoryKib) || !Number.isInteger(passCount) || !Number.isInteger(lanes)) return false;
    if (memoryKib !== ARGON2_MEMORY_KIB || passCount !== ARGON2_PASSES || lanes !== ARGON2_PARALLELISM) return false;
    const salt = Buffer.from(salt64, 'base64url');
    const expected = Buffer.from(hash64, 'base64url');
    if (salt.length < 8 || expected.length !== ARGON2_TAG_LEN) return false;
    const actual = argon2Sync('argon2id', {
      message: password,
      nonce: salt,
      parallelism: lanes,
      tagLength: expected.length,
      memory: memoryKib,
      passes: passCount,
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}
export function sameSecret(a, b) {
  const left = Buffer.from(a, 'utf8'), right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}
export const SECURITY_PARAMETERS = Object.freeze({
  accessTokenTtlSeconds: 300,
  refreshTokenTtlSeconds: 60 * 60 * 24 * 30,
  recoveryTokenTtlSeconds: 15 * 60,
  argon2id: { memoryKib: ARGON2_MEMORY_KIB, passes: ARGON2_PASSES, parallelism: ARGON2_PARALLELISM, tagLength: ARGON2_TAG_LEN, version: ARGON2_VERSION },
  tokenBytes: TOKEN_BYTES
});
