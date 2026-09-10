import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const DEFAULT_STEP_SECONDS = 30;
const DEFAULT_DIGITS = 6;
const DEFAULT_WINDOW = 1;
const DEFAULT_MAX_ATTEMPTS = 5;
const SECRET_BYTES = 20;
const RECOVERY_CODE_BYTES = 16;
const RECOVERY_CODE_COUNT = 10;
const CHALLENGE_TTL_SECONDS = 300;
const MFA_ENCRYPTION_KEY_ENV = 'AFX_MFA_ENCRYPTION_KEY';

function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input) {
  const normalized = input.replace(/=+$/u, '').replace(/\s+/gu, '').toUpperCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of normalized) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('invalid_mfa_secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret, counter, digits = DEFAULT_DIGITS) {
  const buffer = Buffer.alloc(8);
  let value = counter;
  for (let index = 7; index >= 0; index -= 1) {
    buffer[index] = value & 0xff;
    value = Math.floor(value / 256);
  }
  const digest = createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % (10 ** digits)).padStart(digits, '0');
}

function encryptionKey(key = process.env[MFA_ENCRYPTION_KEY_ENV]) {
  if (!key) throw new Error('mfa_encryption_key_unavailable');
  const decoded = Buffer.from(key, 'base64url');
  if (decoded.length !== 32) throw new Error('invalid_mfa_encryption_key');
  return decoded;
}

export function encryptMfaSecret(secret, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(key), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptMfaSecret(encoded, key) {
  const [version, iv64, tag64, ciphertext64] = encoded.split('.');
  if (version !== 'v1' || !iv64 || !tag64 || !ciphertext64) throw new Error('invalid_mfa_ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(key), Buffer.from(iv64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag64, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext64, 'base64url')), decipher.final()]).toString('utf8');
}

export function generateMfaSecret() {
  return base32Encode(randomBytes(SECRET_BYTES));
}

export function generateRecoveryCodes() {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => randomBytes(RECOVERY_CODE_BYTES).toString('hex'));
}

export function getTotpStep(nowMs = Date.now(), stepSeconds = DEFAULT_STEP_SECONDS) {
  return Math.floor(nowMs / 1000 / stepSeconds);
}

export function verifyTotpStep({ secret, code, nowMs = Date.now(), stepSeconds = DEFAULT_STEP_SECONDS, window = DEFAULT_WINDOW }) {
  if (!/^\d{6}$/u.test(code)) return null;
  const timestep = getTotpStep(nowMs, stepSeconds);
  for (let delta = -window; delta <= window; delta += 1) {
    const candidateStep = timestep + delta;
    if (candidateStep < 0) continue;
    const candidate = hotp(secret, candidateStep);
    const left = Buffer.from(candidate, 'ascii');
    const right = Buffer.from(code, 'ascii');
    if (left.length === right.length && timingSafeEqual(left, right)) return candidateStep;
  }
  return null;
}

export function verifyTotp(args) {
  return verifyTotpStep(args) !== null;
}

export const MFA_PARAMETERS = Object.freeze({
  totp: {
    algorithm: 'HMAC-SHA1',
    stepSeconds: DEFAULT_STEP_SECONDS,
    digits: DEFAULT_DIGITS,
    verificationWindow: DEFAULT_WINDOW,
    secretBytes: SECRET_BYTES
  },
  maxAttempts: DEFAULT_MAX_ATTEMPTS,
  recoveryCodeCount: RECOVERY_CODE_COUNT,
  recoveryCodeBytes: RECOVERY_CODE_BYTES,
  challengeTtlSeconds: CHALLENGE_TTL_SECONDS,
  encryption: { algorithm: 'AES-256-GCM', keyEnv: MFA_ENCRYPTION_KEY_ENV }
});
