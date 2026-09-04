import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { WebAuthnService } from '../../src/webauthn.js';
import { chromium } from 'playwright';

const ORIGIN = 'http://localhost:4173';
const RP_ID = 'localhost';
const USER_ID = 'usr_browser_evidence';
const webauthn = new WebAuthnService({ rpId: RP_ID, origins: [ORIGIN] });

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/') return html(res);
    if (req.url === '/register/options') return json(res, 200, webauthn.beginRegistration({ userId: USER_ID, userName: 'browser@afaghx.test', displayName: 'AFAGHX Browser Test' }));
    if (req.url === '/register/verify') {
      const body = await readJson(req);
      return json(res, 200, webauthn.finishRegistration({ userId: USER_ID, challengeId: body.challengeId, credential: body.credential, origin: req.headers.origin }));
    }
    if (req.url === '/auth/options') {
      const credentials = webauthn.listCredentials(USER_ID).filter(item => !item.revoked).map(item => item.id);
      return json(res, 200, webauthn.beginAuthentication({ userId: USER_ID, allowCredentials: credentials }));
    }
    if (req.url === '/auth/verify') {
      const body = await readJson(req);
      return json(res, 200, webauthn.finishAuthentication({ userId: USER_ID, challengeId: body.challengeId, credential: body.credential, origin: req.headers.origin }));
    }
    if (req.url === '/evil-register') {
      const body = await readJson(req);
      return json(res, 200, webauthn.finishRegistration({ userId: USER_ID, challengeId: body.challengeId, credential: body.credential, origin: 'https://evil.example' }));
    }
    return json(res, 404, { error: 'not_found' });
  } catch (error) { return json(res, 400, { error: error.message }); }
});

function html(res) {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><meta charset="utf-8"><title>AFAGHX WebAuthn Evidence</title><script>
    const b64 = a => btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
    const bytes = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-s.length%4)%4)), c=>c.charCodeAt(0));
    async function register() {
      const options = await (await fetch('/register/options')).json();
      const publicKey = structuredClone(options.publicKey); publicKey.challenge = bytes(publicKey.challenge); publicKey.user.id = bytes(publicKey.user.id);
      const cred = await navigator.credentials.create({ publicKey });
      const credential = { id: cred.id, rawId: b64(cred.rawId), type: cred.type, response: { clientDataJSON: b64(cred.response.clientDataJSON), attestationObject: b64(cred.response.attestationObject) } };
      window.lastRegistration = credential;
      return await (await fetch('/register/verify', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ challengeId:options.challengeId, credential }) })).json();
    }
    async function authenticate() {
      const options = await (await fetch('/auth/options')).json();
      const publicKey = structuredClone(options.publicKey); publicKey.challenge = bytes(publicKey.challenge); publicKey.allowCredentials = publicKey.allowCredentials.map(c => ({ ...c, id: bytes(c.id) }));
      const cred = await navigator.credentials.get({ publicKey });
      const credential = { id: cred.id, rawId: b64(cred.rawId), type: cred.type, response: { clientDataJSON: b64(cred.response.clientDataJSON), authenticatorData: b64(cred.response.authenticatorData), signature: b64(cred.response.signature), userHandle: cred.response.userHandle ? b64(cred.response.userHandle) : null } };
      return await (await fetch('/auth/verify', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ challengeId:options.challengeId, credential }) })).json();
    }
    window.register = register; window.authenticate = authenticate;
  <\/script>`);
}
function json(res, status, value) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); }
function readJson(req) { return new Promise((resolve, reject) => { let raw = ''; req.setEncoding('utf8'); req.on('data', chunk => { raw += chunk; }); req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (error) { reject(error); } }); }); }

await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  await page.goto(ORIGIN);

  const registered = await page.evaluate(() => register());
  assert.match(registered.credentialId, /^[A-Za-z0-9_-]+$/);
  const authenticated = await page.evaluate(() => authenticate());
  assert.equal(authenticated.userId, USER_ID);
  assert.equal(authenticated.credentialId, registered.credentialId);

  const freshOptions = await page.evaluate(async () => (await (await fetch('/register/options')).json()));
  const credential = await page.evaluate(() => window.lastRegistration);
  const rejected = await page.evaluate(async ({ challengeId, credential }) => (await (await fetch('/evil-register', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ challengeId, credential }) })).json()), { challengeId: freshOptions.challengeId, credential });
  assert.equal(rejected.error, 'origin_not_allowed');

  console.log(JSON.stringify({ control:'G01-15', browser:'Chromium', registration:'PASS', authentication:'PASS', rpId:RP_ID, origin:ORIGIN, virtualAuthenticator:authenticatorId, invalidOriginBoundary:'PASS' }));
} finally {
  await browser.close();
  server.close();
}
