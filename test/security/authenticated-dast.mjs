import { createCipheriv, createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const base = process.env.DAST_BASE_URL ?? 'http://127.0.0.1:3000/api';
const email = process.env.DAST_EMAIL ?? 'dast-admin@afaghx.test';
const password = process.env.DAST_PASSWORD ?? 'DAST-Initial-Password-2026!';
const recoveryPassword = process.env.DAST_RECOVERY_PASSWORD ?? 'DAST-Recovered-Password-2026!';
const secretKey = Buffer.from(process.env.AFX_SECRET_BOX_KEY, 'base64url');
const prisma = new PrismaClient();

function assert(condition, message) { if (!condition) throw new Error(`DAST FAIL: ${message}`); }
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers ?? {}) } });
  let body = null; try { body = await response.json(); } catch { /* non-JSON */ }
  return { response, body };
}
function totp(secret, timestamp = Date.now()) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secret.toUpperCase().replace(/=+$/, '')) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.alloc(Math.floor(bits.length / 8)); for (let i = 0; i < key.length; i++) key[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const counter = Math.floor(timestamp / 30000); const msg = Buffer.alloc(8); msg.writeBigInt64BE(BigInt(counter));
  const mac = createHmac('sha1', key).update(msg).digest(); const offset = mac[19] & 15;
  return String(((mac.readUInt32BE(offset) & 0x7fffffff) % 1000000)).padStart(6, '0');
}
function encryptSecret(plaintext) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', secretKey, iv); const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
}

try {
  assert(secretKey.length === 32, 'AFX_SECRET_BOX_KEY must be 32 bytes');
  const orgId = randomUUID(); const tenantId = randomUUID(); const foreignTenantId = randomUUID(); const identityId = randomUUID(); const membershipId = randomUUID();
  const totpSecret = 'JBSWY3DPEHPK3PXP';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.identity.upsert({ where: { email }, update: { status: 'ACTIVE', passwordHash }, create: { id: identityId, email, passwordHash } });
  const identity = await prisma.identity.findUniqueOrThrow({ where: { email } });
  await prisma.organization.upsert({ where: { id: orgId }, update: {}, create: { id: orgId, name: 'DAST Org' } });
  await prisma.tenant.upsert({ where: { id: tenantId }, update: {}, create: { id: tenantId, organizationId: orgId, name: 'DAST Tenant' } });
  await prisma.tenant.upsert({ where: { id: foreignTenantId }, update: {}, create: { id: foreignTenantId, organizationId: orgId, name: 'Foreign Tenant' } });
  await prisma.membership.upsert({ where: { identityId_tenantId: { identityId: identity.id, tenantId } }, update: { status: 'ACTIVE', organizationId: orgId }, create: { id: membershipId, identityId: identity.id, organizationId: orgId, tenantId, status: 'ACTIVE' } });
  await prisma.mfaFactor.deleteMany({ where: { identityId: identity.id } });
  await prisma.mfaFactor.create({ data: { identityId: identity.id, type: 'totp', status: 'ACTIVE', secretCiphertext: encryptSecret(totpSecret) } });
  const rawRecovery = `dast-${randomBytes(32).toString('base64url')}`;
  await prisma.recoveryToken.deleteMany({ where: { identityId: identity.id } });
  await prisma.recoveryToken.create({ data: { identityId: identity.id, tokenHash: createHash('sha256').update(rawRecovery).digest('hex'), status: 'ACTIVE', expiresAt: new Date(Date.now() + 600000) } });

  let r = await request('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  assert(r.response.status === 401, 'MFA must block password-only login');
  r = await request('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password, mfaCode: totp(totpSecret) }) });
  assert(r.response.ok && r.body?.accessToken && r.body?.refreshToken, 'login + MFA failed');
  const access = r.body.accessToken; let refresh = r.body.refreshToken;
  assert(r.body.authenticationLevel === 'aal2', 'MFA login must produce AAL2');

  r = await request('/v1/auth/me', { headers: { authorization: `Bearer ${access}` } });
  assert(r.response.ok, 'authenticated /me failed');
  assert(r.body.tenantId === tenantId, 'tenant context mismatch');

  r = await request('/v1/auth/me', { headers: { authorization: `Bearer ${access}`, 'x-afx-tenant-id': foreignTenantId } });
  assert(r.response.status === 401 || r.response.status === 403, 'tenant breakout was not denied');

  r = await request('/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: refresh }) });
  assert(r.response.ok && r.body?.accessToken && r.body?.refreshToken, 'refresh failed');
  refresh = r.body.refreshToken;
  const rotated = r.body.accessToken;
  r = await request('/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: refresh }) });
  assert(r.response.ok, 'second legitimate refresh failed');

  r = await request('/v1/auth/recovery/consume', { method: 'POST', body: JSON.stringify({ token: rawRecovery, newPassword: recoveryPassword }) });
  assert(r.response.ok, 'recovery consume failed');
  r = await request('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password: recoveryPassword, mfaCode: totp(totpSecret) }) });
  assert(r.response.ok, 'login after recovery failed');
  r = await request('/v1/auth/recovery/consume', { method: 'POST', body: JSON.stringify({ token: rawRecovery, newPassword: password }) });
  assert(r.response.status === 401 || r.response.status === 400, 'recovery token replay was accepted');

  const securityHeaders = [r.response.headers.get('cache-control')];
  assert(securityHeaders.some((v) => v?.includes('no-store')), 'sensitive endpoint did not send no-store');
  console.log(JSON.stringify({ status: 'passed', checks: ['login', 'mfa', 'refresh', 'recovery', 'authorization', 'tenant-breakout'], rotatedAccessTokenPresent: Boolean(rotated) }));
} finally {
  await prisma.$disconnect();
}
