# G01-15 — Browser WebAuthn / Passkeys

**Status:** IN PROGRESS — server verification foundation and real Chromium evidence harness implemented; durable credential persistence, production origin/RP-ID configuration, deployment HTTPS validation, and final security review remain required.

## Security contract

AFAGHX treats WebAuthn as an AFX-CORE authentication capability. No Domain owns a separate passkey authority, credential store, or session issuer.

The implementation follows WebAuthn Level 3 concepts: Registration creates a credential scoped to an RP ID; Authentication verifies an assertion using the stored public key. The RP must validate both the client-data origin and the RP ID hash. The current foundation uses ES256/P-256, resident credentials and required user verification, with attestation set to `none`.

## Implemented controls

- cryptographically random 32-byte challenges
- five-minute challenge lifetime and one-time consumption
- exact allow-listed origin validation
- RP ID validation against the configured origin policy
- registration client-data type/challenge/origin validation
- registration authenticator-data RP ID hash validation
- attestationObject CBOR parsing and `fmt=none` enforcement
- COSE EC2 / ES256 / P-256 public-key extraction
- credential-ID uniqueness
- authentication client-data type/challenge/origin validation
- authentication RP ID hash validation
- user-presence and user-verification enforcement
- ES256 signature verification over authenticatorData + SHA-256(clientDataJSON)
- sign-counter regression detection when both counters are non-zero
- explicit credential revocation and listing lifecycle
- backup-eligible / backup-state metadata capture
- AFX-CORE facade methods for registration, authentication and credential lifecycle

## Browser evidence

`core/AFX-CORE/test/browser/g01-15-browser.test.mjs` starts a localhost HTTP relying-party harness, launches real Chromium through Playwright, attaches a Chrome DevTools Protocol virtual CTAP2 authenticator, executes `navigator.credentials.create()` for Registration, executes `navigator.credentials.get()` for Authentication, and submits both browser-generated payloads to the AFX-CORE verifier.

The same evidence harness sends a valid browser-generated credential against a deliberately disallowed origin and requires `origin_not_allowed`.

## Production closure requirements

G01-15 cannot become `DONE` until:

1. the Browser/Playwright job passes on GitHub Actions and publishes its machine-readable evidence artifact;
2. credential records and challenge state are durably persisted with tenant/user ownership constraints;
3. production RP ID and allowed-origin values are deployed from controlled configuration;
4. HTTPS deployment is verified for every production origin;
5. credential lifecycle operations are integrated with session/MFA/recovery policy;
6. final security review confirms no Domain bypass and no credential-secret leakage.

## Evidence contract

A green browser test alone is not production closure. Required evidence is: reviewed commit, unit/security tests, GitHub Actions browser job, browser log/artifact, deployment origin policy, persistence evidence, and final security review.
