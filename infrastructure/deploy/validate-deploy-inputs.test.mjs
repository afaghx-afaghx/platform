import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const validator = fileURLToPath(new URL('./validate-deploy-inputs.mjs', import.meta.url));
const validEnv = () => ({
  ...process.env,
  DEPLOY_HOST: '1.1.1.1',
  DEPLOY_USER: 'afxdeploy',
  DEPLOY_PORT: '22',
  API_BASE_URL: 'https://api.afaghx.com',
  ALLOWED_ORIGIN: 'https://www.afaghx.com',
  ACME_EMAIL: 'ops@example.com',
  DATABASE_URL: 'postgresql://fixture_user:fixture_password@db.example.invalid:5432/afx',
  SSH_PRIVATE_KEY: [
    '-----BEGIN OPENSSH PRIVATE KEY-----',
    'fixture-only-not-a-real-key',
    '-----END OPENSSH PRIVATE KEY-----'
  ].join('\n'),
  SSH_KNOWN_HOSTS: 'fixture.invalid ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFixtureOnly',
  SMOKE_EMAIL: 'smoke@example.com',
  SMOKE_PASSWORD: 'fixture-only-not-a-real-password',
  SMOKE_TENANT_ID: 'tenant-fixture-only',
  GITHUB_SHA: 'a'.repeat(40),
  GITHUB_RUN_ID: '12345',
  GITHUB_OUTPUT: ''
});

function run(env) {
  return spawnSync(process.execPath, [validator], { env, encoding: 'utf8' });
}

test('deployment input contract accepts complete safe-shaped fixtures', () => {
  const result = run(validEnv());
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Secret values were not displayed/);
});

test('deployment input contract rejects documentation-only server addresses', () => {
  const result = run({ ...validEnv(), DEPLOY_HOST: '192.0.2.10' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /public_routable_IPv4/);
});

test('deployment input contract rejects database URLs that can override explicit TLS', () => {
  const result = run({ ...validEnv(), DATABASE_URL: 'postgresql://fixture_user:fixture_password@db.example.invalid:5432/afx?sslmode=disable' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must_not_override_verified_TLS/);
});

test('deployment input contract rejects an HTTP API URL', () => {
  const result = run({ ...validEnv(), API_BASE_URL: 'http://api.afaghx.com' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /API_BASE_URL_must_be_https/);
});

test('deployment input contract rejects an origin containing a path', () => {
  const result = run({ ...validEnv(), ALLOWED_ORIGIN: 'https://www.afaghx.com/subpath' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /single_canonical_https_origin/);
});
