import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BYTES = 8;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input) {
  const normalized = String(input).replace(/=+$/u, '').replace(/\s+/gu, '').toUpperCase();
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

function totp(secret, timestampMs) {
  const counter = Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
}

function safeCodeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function generateTotpCode(secret, timestampMs = Date.now()) {
  return totp(secret, timestampMs);
}

export function verifyTotpCode(secret, code, timestampMs = Date.now()) {
  if (!/^\d{6}$/u.test(String(code))) return false;
  const currentStep = Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS);
  for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta += 1) {
    const candidate = totp(secret, (currentStep + delta) * TOTP_STEP_SECONDS * 1000);
    if (safeCodeEqual(candidate, code)) return true;
  }
  return false;
}

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT) {
  return Array.from({ length: count }, () => randomBytes(RECOVERY_CODE_BYTES).toString('hex'));
}

export function hashRecoveryCode(code) {
  return createHash('sha256').update(String(code), 'utf8').digest('hex');
}

export function encryptMfaSecret(secret, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('mfa_key_unavailable');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptMfaSecret(payload, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('mfa_key_unavailable');
  const [ivText, tagText, ciphertextText] = String(payload).split('.');
  if (!ivText || !tagText || !ciphertextText) throw new Error('invalid_mfa_secret');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')), decipher.final()]).toString('utf8');
}

export const MFA_PARAMETERS = Object.freeze({
  totp: { algorithm: 'SHA-1', digits: TOTP_DIGITS, periodSeconds: TOTP_STEP_SECONDS, window: TOTP_WINDOW },
  recoveryCodeCount: RECOVERY_CODE_COUNT,
  challengeTtlMs: CHALLENGE_TTL_MS,
});
