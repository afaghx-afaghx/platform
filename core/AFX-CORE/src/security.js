import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 3;
const KEY_LEN = 32;
const SALT_BYTES = 16;
const TOKEN_BYTES = 32;
const MAX_PASSWORD_BYTES = 1024;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

function derivePasswordKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LEN,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM },
      (error, derived) => error ? reject(error) : resolve(derived)
    );
  });
}

function validPasswordInput(password) {
  return typeof password === 'string'
    && Buffer.byteLength(password, 'utf8') >= 12
    && Buffer.byteLength(password, 'utf8') <= MAX_PASSWORD_BYTES;
}

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

/**
 * Asynchronous, memory-hard password hashing.
 * The wire/storage format remains compatible with the existing scrypt records.
 * The libuv worker pool performs scrypt without blocking the JavaScript event loop.
 */
export async function hashPassword(password) {
  if (!validPasswordInput(password)) {
    throw new Error(Buffer.byteLength(typeof password === 'string' ? password : '', 'utf8') > MAX_PASSWORD_BYTES
      ? 'password_too_long'
      : 'weak_password');
  }
  const salt = randomBytes(SALT_BYTES);
  const derived = await derivePasswordKey(password, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  try {
    if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES || typeof encoded !== 'string') return false;
    const parts = encoded.split('$');
    if (parts.length !== 6) return false;
    const [algorithm, n, r, p, salt64, hash64] = parts;
    if (algorithm !== 'scrypt'
      || n !== String(SCRYPT_N)
      || r !== String(SCRYPT_R)
      || p !== String(SCRYPT_P)) return false;

    const salt = Buffer.from(salt64, 'base64url');
    const expected = Buffer.from(hash64, 'base64url');
    if (salt.length !== SALT_BYTES || expected.length !== KEY_LEN) return false;

    const actual = await derivePasswordKey(password, salt);
    return timingSafeEqual(expected, actual);
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
  scrypt: { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, keyLength: KEY_LEN, saltBytes: SALT_BYTES, maxmemBytes: SCRYPT_MAXMEM },
  tokenBytes: TOKEN_BYTES
});
