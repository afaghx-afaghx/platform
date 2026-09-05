import { createHash, createPublicKey, randomBytes, verify as verifySignature } from 'node:crypto';

const COSE_KTY_EC2 = 2;
const COSE_ALG_ES256 = -7;
const COSE_CRV_P256 = 1;
const FLAG_UP = 0x01;
const FLAG_UV = 0x04;
const FLAG_AT = 0x40;
const FLAG_BE = 0x08;
const FLAG_BS = 0x10;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function b64url(buffer) { return Buffer.from(buffer).toString('base64url'); }
function fromB64url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid_base64url');
  return Buffer.from(value, 'base64url');
}
function equalBytes(a, b) { return a.length === b.length && a.equals(b); }
function sha256(data) { return createHash('sha256').update(data).digest(); }

class CborReader {
  constructor(buffer) { this.buffer = buffer; this.offset = 0; }
  _readLength(additional) {
    if (additional < 24) return additional;
    if (additional === 24) return this.buffer[this.offset++];
    if (additional === 25) { const n = this.buffer.readUInt16BE(this.offset); this.offset += 2; return n; }
    if (additional === 26) { const n = this.buffer.readUInt32BE(this.offset); this.offset += 4; return n; }
    if (additional === 27) { const n = Number(this.buffer.readBigUInt64BE(this.offset)); this.offset += 8; return n; }
    throw new Error('unsupported_cbor_length');
  }
  read() {
    if (this.offset >= this.buffer.length) throw new Error('invalid_cbor');
    const initial = this.buffer[this.offset++];
    const major = initial >> 5;
    const additional = initial & 0x1f;
    if (major === 0) return this._readLength(additional);
    if (major === 1) return -1 - this._readLength(additional);
    if (major === 2) { const n = this._readLength(additional); const out = this.buffer.subarray(this.offset, this.offset + n); this.offset += n; return Buffer.from(out); }
    if (major === 3) { const n = this._readLength(additional); const out = this.buffer.subarray(this.offset, this.offset + n); this.offset += n; return out.toString('utf8'); }
    if (major === 4) { const n = this._readLength(additional); return Array.from({ length: n }, () => this.read()); }
    if (major === 5) {
      const n = this._readLength(additional); const map = new Map();
      for (let i = 0; i < n; i += 1) map.set(this.read(), this.read());
      return map;
    }
    throw new Error('unsupported_cbor_type');
  }
}
function parseCbor(buffer) { const reader = new CborReader(buffer); const value = reader.read(); if (reader.offset !== buffer.length) throw new Error('trailing_cbor_data'); return value; }

function normalizeOrigin(origin) {
  if (typeof origin !== 'string' || origin.length === 0) throw new Error('invalid_origin');
  let parsed; try { parsed = new URL(origin); } catch { throw new Error('invalid_origin'); }
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && parsed.hostname === 'localhost')) throw new Error('invalid_origin');
  return parsed.origin;
}
function isValidRpIdForOrigin(rpId, origin) {
  if (typeof rpId !== 'string' || !/^[a-z0-9.-]+$/i.test(rpId)) return false;
  const host = new URL(origin).hostname.toLowerCase();
  const id = rpId.toLowerCase();
  return host === id || host.endsWith(`.${id}`);
}

function coseToPublicKey(cose) {
  if (!(cose instanceof Map)) throw new Error('invalid_cose_key');
  if (cose.get(1) !== COSE_KTY_EC2 || cose.get(3) !== COSE_ALG_ES256 || cose.get(-1) !== COSE_CRV_P256) throw new Error('unsupported_credential_key');
  const x = cose.get(-2), y = cose.get(-3);
  if (!Buffer.isBuffer(x) || !Buffer.isBuffer(y) || x.length !== 32 || y.length !== 32) throw new Error('invalid_credential_key');
  const der = Buffer.concat([Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex'), Buffer.from([0x04]), x, y]);
  return createPublicKey({ key: der, format: 'der', type: 'spki' });
}
function parseClientData(clientDataJSON) {
  let clientData; try { clientData = JSON.parse(Buffer.from(clientDataJSON).toString('utf8')); } catch { throw new Error('invalid_client_data'); }
  if (!clientData || typeof clientData !== 'object') throw new Error('invalid_client_data');
  if (typeof clientData.type !== 'string' || typeof clientData.challenge !== 'string' || typeof clientData.origin !== 'string') throw new Error('invalid_client_data');
  return clientData;
}
function parseAttestationObject(attestationObject) {
  const decoded = parseCbor(attestationObject);
  if (!(decoded instanceof Map)) throw new Error('invalid_attestation_object');
  const authData = decoded.get('authData'), fmt = decoded.get('fmt');
  if (!Buffer.isBuffer(authData) || typeof fmt !== 'string') throw new Error('invalid_attestation_object');
  if (fmt !== 'none' || authData.length < 55) throw new Error('unsupported_attestation_format');
  const rpIdHash = authData.subarray(0, 32), flags = authData[32], signCount = authData.readUInt32BE(33);
  if (!((flags & FLAG_UP) !== 0 && (flags & FLAG_AT) !== 0)) throw new Error('user_presence_required');
  let offset = 37;
  const aaguid = authData.subarray(offset, offset + 16); offset += 16;
  const credentialIdLength = authData.readUInt16BE(offset); offset += 2;
  const credentialId = authData.subarray(offset, offset + credentialIdLength); offset += credentialIdLength;
  if (credentialId.length < 16 || credentialId.length > 1024 || offset >= authData.length) throw new Error('invalid_credential_id');
  return { rpIdHash, flags, signCount, aaguid, credentialId, publicKey: coseToPublicKey(parseCbor(authData.subarray(offset))) };
}
function parseAuthenticatorData(authenticatorData) {
  if (!Buffer.isBuffer(authenticatorData) || authenticatorData.length < 37) throw new Error('invalid_authenticator_data');
  return { rpIdHash: authenticatorData.subarray(0, 32), flags: authenticatorData[32], signCount: authenticatorData.readUInt32BE(33) };
}

export class WebAuthnService {
  constructor({ rpId, origins, clock = () => Date.now() } = {}) {
    if (typeof rpId !== 'string' || rpId.length === 0) throw new Error('invalid_rp_id');
    const normalizedOrigins = [...new Set((Array.isArray(origins) ? origins : [origins]).filter(Boolean).map(normalizeOrigin))];
    if (normalizedOrigins.length === 0 || !normalizedOrigins.every(origin => isValidRpIdForOrigin(rpId, origin))) throw new Error('invalid_webauthn_origin_policy');
    this.rpId = rpId.toLowerCase(); this.origins = new Set(normalizedOrigins); this.clock = clock;
    this.challenges = new Map(); this.credentials = new Map();
  }
  _validateOrigin(origin) { return this.origins.has(normalizeOrigin(origin)); }
  _challenge(kind, userId = null) {
    const value = randomBytes(32), challenge = b64url(value), id = challenge;
    const expiresAt = this.clock() + CHALLENGE_TTL_MS;
    this.challenges.set(id, { id, kind, userId, challenge, expiresAt, consumed: false });
    return { id, challenge, expiresAt };
  }
  beginRegistration({ userId, userName, displayName }) {
    if (!userId || !userName) throw new Error('invalid_webauthn_user');
    const pending = this._challenge('registration', userId);
    return { challengeId: pending.id, publicKey: { challenge: pending.challenge, rp: { id: this.rpId, name: 'AFAGHX' }, user: { id: b64url(Buffer.from(String(userId), 'utf8')), name: userName, displayName: displayName || userName }, pubKeyCredParams: [{ type: 'public-key', alg: COSE_ALG_ES256 }], timeout: 60000, attestation: 'none', authenticatorSelection: { residentKey: 'required', userVerification: 'required' } } };
  }
  finishRegistration({ userId, challengeId, credential, origin }) {
    if (!credential?.id || !credential?.response?.clientDataJSON || !credential?.response?.attestationObject) throw new Error('invalid_registration_response');
    const pending = this.challenges.get(challengeId);
    if (!pending || pending.consumed || pending.kind !== 'registration' || pending.userId !== userId || pending.expiresAt <= this.clock()) throw new Error('invalid_webauthn_challenge');
    const normalizedOrigin = normalizeOrigin(origin);
    if (!this._validateOrigin(normalizedOrigin)) throw new Error('origin_not_allowed');
    const clientDataJSON = fromB64url(credential.response.clientDataJSON), clientData = parseClientData(clientDataJSON);
    if (clientData.type !== 'webauthn.create' || clientData.origin !== normalizedOrigin || clientData.challenge !== pending.challenge) throw new Error('registration_client_data_mismatch');
    const parsed = parseAttestationObject(fromB64url(credential.response.attestationObject));
    if (!equalBytes(parsed.rpIdHash, sha256(Buffer.from(this.rpId, 'utf8')))) throw new Error('rp_id_hash_mismatch');
    const credentialId = b64url(parsed.credentialId);
    if (this.credentials.has(credentialId)) throw new Error('credential_exists');
    const record = { id: credentialId, userId, publicKey: parsed.publicKey, signCount: parsed.signCount, aaguid: b64url(parsed.aaguid), backupEligible: Boolean(parsed.flags & FLAG_BE), backupState: Boolean(parsed.flags & FLAG_BS), revoked: false, createdAt: this.clock(), lastUsedAt: null };
    this.credentials.set(credentialId, record); pending.consumed = true;
    return { credentialId, signCount: record.signCount, aaguid: record.aaguid };
  }
  beginAuthentication({ userId = null, allowCredentials = [] } = {}) {
    const pending = this._challenge('authentication', userId);
    return { challengeId: pending.id, publicKey: { challenge: pending.challenge, rpId: this.rpId, timeout: 60000, userVerification: 'required', allowCredentials: allowCredentials.map(id => ({ type: 'public-key', id: fromB64url(id) })) } };
  }
  finishAuthentication({ userId = null, challengeId, credential, origin }) {
    if (!credential?.id || !credential?.response?.clientDataJSON || !credential?.response?.authenticatorData || !credential?.response?.signature) throw new Error('invalid_authentication_response');
    const pending = this.challenges.get(challengeId);
    if (!pending || pending.consumed || pending.kind !== 'authentication' || pending.expiresAt <= this.clock()) throw new Error('invalid_webauthn_challenge');
    const normalizedOrigin = normalizeOrigin(origin);
    if (!this._validateOrigin(normalizedOrigin)) throw new Error('origin_not_allowed');
    const record = this.credentials.get(credential.id);
    if (!record || record.revoked || (userId && record.userId !== userId)) throw new Error('unknown_webauthn_credential');
    const clientDataJSON = fromB64url(credential.response.clientDataJSON), clientData = parseClientData(clientDataJSON);
    if (clientData.type !== 'webauthn.get' || clientData.origin !== normalizedOrigin || clientData.challenge !== pending.challenge) throw new Error('authentication_client_data_mismatch');
    const authenticatorData = fromB64url(credential.response.authenticatorData), parsed = parseAuthenticatorData(authenticatorData);
    if (!equalBytes(parsed.rpIdHash, sha256(Buffer.from(this.rpId, 'utf8')))) throw new Error('rp_id_hash_mismatch');
    if ((parsed.flags & FLAG_UP) === 0 || (parsed.flags & FLAG_UV) === 0) throw new Error('user_verification_required');
    const signature = fromB64url(credential.response.signature);
    if (!verifySignature('sha256', Buffer.concat([authenticatorData, sha256(clientDataJSON)]), record.publicKey, signature)) throw new Error('invalid_webauthn_signature');
    if (record.signCount !== 0 && parsed.signCount !== 0 && parsed.signCount <= record.signCount) throw new Error('sign_count_regression');
    record.signCount = parsed.signCount; record.lastUsedAt = this.clock(); pending.consumed = true;
    return { userId: record.userId, credentialId: record.id, signCount: record.signCount, backupEligible: record.backupEligible, backupState: Boolean(parsed.flags & FLAG_BS) };
  }
  revokeCredential(credentialId) { const record = this.credentials.get(credentialId); if (!record) return false; record.revoked = true; return true; }
  listCredentials(userId) { return [...this.credentials.values()].filter(record => record.userId === userId).map(({ id, aaguid, signCount, backupEligible, backupState, revoked, createdAt, lastUsedAt }) => ({ id, aaguid, signCount, backupEligible, backupState, revoked, createdAt, lastUsedAt })); }
}

export const WEBAUTHN_PARAMETERS = Object.freeze({ protocol: 'WebAuthn Level 3 Candidate Recommendation', algorithm: 'ES256', curve: 'P-256', residentKey: 'required', userVerification: 'required', attestation: 'none', challengeBytes: 32, challengeTtlMs: CHALLENGE_TTL_MS, maxCredentialIdBytes: 1024 });
