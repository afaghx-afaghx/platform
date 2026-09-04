import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 3;
const KEY_LEN = 32;
const TOKEN_BYTES = 32;

export function normalizeEmail(email) {
  if (typeof email !== 'string') throw new Error('invalid_email');
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('invalid_email');
  return value;
}

export function randomToken() {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function tokenDigest(token) {
  return createHash('sha256').update(token, 'utf8').digest('base64url');
}

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('weak_password');
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export function verifyPassword(password, encoded) {
  try {
    const [algorithm, n, r, p, salt64, hash64] = encoded.split('$');
    if (algorithm !== 'scrypt') return false;
    const salt = Buffer.from(salt64, 'base64url');
    const expected = Buffer.from(hash64, 'base64url');
    const actual = scryptSync(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function sameSecret(a, b) {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

export const SECURITY_PARAMETERS = Object.freeze({
  accessTokenTtlSeconds: 300,
  refreshTokenTtlSeconds: 60 * 60 * 24 * 30,
  scrypt: { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, keyLength: KEY_LEN },
  tokenBytes: TOKEN_BYTES
});
