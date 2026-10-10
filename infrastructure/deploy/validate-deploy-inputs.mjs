import fs from 'node:fs';
import { isIP } from 'node:net';

const env = process.env;
const required = [
  'DEPLOY_HOST',
  'DEPLOY_USER',
  'DEPLOY_PORT',
  'API_BASE_URL',
  'ALLOWED_ORIGIN',
  'ACME_EMAIL',
  'DATABASE_URL',
  'SSH_PRIVATE_KEY',
  'SSH_KNOWN_HOSTS',
  'SMOKE_EMAIL',
  'SMOKE_PASSWORD',
  'SMOKE_TENANT_ID',
  'GITHUB_SHA',
  'GITHUB_RUN_ID'
];

for (const name of required) {
  if (!String(env[name] || '').trim()) throw new Error('required_environment_input_missing:' + name);
}

if (!/^[0-9a-f]{40}$/.test(env.GITHUB_SHA)) throw new Error('invalid_workflow_commit_sha');
if (!/^\d+$/.test(env.GITHUB_RUN_ID)) throw new Error('invalid_workflow_run_id');

if (isIP(env.DEPLOY_HOST) !== 4) throw new Error('AFAGHX_DEPLOY_HOST_must_be_the_real_static_public_IPv4');
const [a, b, c] = env.DEPLOY_HOST.split('.').map(Number);
const nonPublicRanges = [
  a === 0,
  a === 10,
  a === 127,
  a >= 224,
  a === 169 && b === 254,
  a === 172 && b >= 16 && b <= 31,
  a === 192 && b === 168,
  a === 192 && b === 0 && c === 0,
  a === 192 && b === 0 && c === 2,
  a === 198 && (b === 18 || b === 19),
  a === 198 && b === 51 && c === 100,
  a === 203 && b === 0 && c === 113,
  a === 100 && b >= 64 && b <= 127
];
if (nonPublicRanges.some(Boolean)) throw new Error('AFAGHX_DEPLOY_HOST_must_be_a_public_routable_IPv4');

if (!/^[a-z_][a-z0-9_-]{0,31}$/.test(env.DEPLOY_USER)) throw new Error('invalid_deploy_username');
const port = Number(env.DEPLOY_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('invalid_ssh_port');

const api = new URL(env.API_BASE_URL);
if (api.protocol !== 'https:' || api.hostname !== 'api.afaghx.com' ||
    (api.pathname !== '/' && api.pathname !== '') || api.search || api.hash ||
    api.username || api.password) {
  throw new Error('API_BASE_URL_must_be_https://api.afaghx.com');
}

const origin = new URL(env.ALLOWED_ORIGIN);
if (origin.protocol !== 'https:' || origin.origin !== env.ALLOWED_ORIGIN ||
    origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('ALLOWED_ORIGIN_must_be_a_single_canonical_https_origin');
}

const db = new URL(env.DATABASE_URL);
if (!['postgres:', 'postgresql:'].includes(db.protocol) ||
    !db.hostname || !db.username || !db.password ||
    ['localhost', '127.0.0.1', '::1', '[::1]'].includes(db.hostname) ||
    Array.from(db.searchParams.keys()).some((key) =>
      ['sslmode', 'ssl', 'sslrootcert', 'sslcert', 'sslkey'].includes(key.toLowerCase())) ||
    /[\r\n']/.test(env.DATABASE_URL)) {
  throw new Error('DATABASE_URL_must_target_real_PostgreSQL_with_URL_encoded_credentials_and_must_not_override_verified_TLS');
}

if (!/-----BEGIN (OPENSSH|RSA|EC|DSA) PRIVATE KEY-----[\s\S]+-----END \\1 PRIVATE KEY-----/.test(env.SSH_PRIVATE_KEY) ||
    !/\S+/.test(env.SSH_KNOWN_HOSTS) ||
    /[\r\n]/.test(env.SMOKE_EMAIL) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SMOKE_EMAIL) ||
    /[\r\n]/.test(env.SMOKE_TENANT_ID)) {
  throw new Error('invalid_secret_format');
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ACME_EMAIL)) throw new Error('invalid_ACME_email');

if (env.GITHUB_OUTPUT) {
  fs.appendFileSync(env.GITHUB_OUTPUT, 'api_domain=api.afaghx.com\n');
  fs.appendFileSync(env.GITHUB_OUTPUT, 'release_dir=/opt/afaghx/releases/' + env.GITHUB_SHA + '-' + env.GITHUB_RUN_ID + '\n');
}
console.log('Production inputs satisfy the deployment contract. Secret values were not displayed.');
