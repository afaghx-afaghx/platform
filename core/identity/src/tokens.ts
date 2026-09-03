import { createHash, randomBytes } from 'node:crypto';

/** Refresh tokens are opaque bearer secrets. Only their SHA-256 digest is persisted. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** 256 bits of randomness encoded as URL-safe text. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}
