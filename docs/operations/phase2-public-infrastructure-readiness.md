# AFX Phase 2 — Public Domain, DNS, TLS and Runtime Readiness

**Spec:** AFX-PUBLIC-INFRASTRUCTURE-READINESS-001  
**Status:** IMPLEMENTED PROBE / INFRASTRUCTURE NOT YET PROVEN  
**Canonical API:** **https://api.afaghx.com**  
**Canonical repository:** **afaghx-afaghx/platform**

## Verified starting position

The repository already records a release-blocking DNS defect in issue [#273](https://github.com/afaghx-afaghx/platform/issues/273). Its last captured public-DNS diagnostic (2026-10-17) showed NXDOMAIN for afaghx.com NS/SOA and for api.afaghx.com A/AAAA/CNAME. The Pages candidate workflow also records that the real API request fails with DNS resolution errors. This is a repository-owned blocker record, not a fresh successful probe.

The intended API deployment topology is specified in the still-unmerged candidate [PR #258](https://github.com/afaghx-afaghx/platform/pull/258): a Linux VPS with a static public IPv4, Caddy for HTTPS, the Gateway container and an external persistent PostgreSQL service over TLS. Its deployment contract explicitly requires the owner to supply the real VPS IP and protected production inputs. It does not contain a verified live IP or registrar configuration.

A GitHub Pages project URL is only the current static-site positive control. It is not the API origin and must never be used as the api.afaghx.com target.

## Implemented repeatable evidence path

Workflow: **.github/workflows/public-infrastructure-readiness.yml**.

- Runs on relevant pull requests, pushes to main, manual dispatch, and an hourly schedule.
- Queries the Verisign .com RDAP registry to check that the domain record exists, the canonical name matches, registry nameservers exist, the registration has not expired, and no DNS-blocking registry status is reported.
- Checks the apex NS and SOA answers through **Google Public DNS** and **Cloudflare Public DNS** using independent DNS-over-HTTPS endpoints.
- Reads all 18 canonical Experience/API hosts from **experience/module-registry.json** and adds the apex redirect host; no IP or CNAME target is guessed.
- Checks A/AAAA/CNAME query evidence from each public resolver and requires an address answer from both resolvers for every required host.
- Performs hostname-verified TLS handshakes to addresses returned by each public resolver. The certificate must chain to a trusted CA, match the hostname, be within its active validity interval, and have at least seven days before expiry.
- Requests the actual HTTPS runtime routes from the GitHub Actions runner. The frontend entrypoints must return 2xx HTML on the declared hostname. The API must return HTTP 200, 401, or 403 from /v1/auth/context, return JSON, and include HSTS.
- Uploads the raw report even when the readiness result is RED. The report includes timestamp, candidate SHA, workflow/run ID, raw DNS answers, TLS certificate metadata, HTTP results, and failure reasons.
- The workflow is read-only. It does not write DNS, change registrar settings, deploy a service, or mutate the module matrix.

## Required provider-side actions — not executable from source control

### 1. Verify domain registration and authoritative DNS

The domain/account holder must sign in to the actual registrar, verify registration/renewal/payment and any hold state, and identify the authoritative DNS provider. Correct the registrar nameserver delegation to the intended authoritative zone. The owner must inspect the authoritative zone after delegation is repaired.

Required acceptance: the .com registry record is valid; at least two registry nameservers are present; Google Public DNS and Cloudflare Public DNS both return the zone's NS and SOA without NXDOMAIN/SERVFAIL.

### 2. Identify and provision the real API origin

The target must come from the selected VPS/hosting account — **never from an example, a guessed IP, an unverified ssh-keyscan, or the GitHub Pages URL**.

The candidate deployment contract in PR #258 expects the protected GitHub Environment **production-platform** to contain:
- Variables: **AFAGHX_DEPLOY_HOST** (the actual static public IPv4), **AFAGHX_DEPLOY_USER**, **AFAGHX_DEPLOY_PORT**, **AFAGHX_API_BASE_URL**, **AFAGHX_ALLOWED_ORIGIN**, and **AFAGHX_ACME_EMAIL**.
- Secrets: **AFAGHX_DEPLOY_SSH_PRIVATE_KEY**, independently verified **AFAGHX_DEPLOY_KNOWN_HOSTS**, **AFAGHX_PRODUCTION_DATABASE_URL**, and isolated smoke-account credentials/tenant settings (**AFAGHX_SMOKE_EMAIL**, **AFAGHX_SMOKE_PASSWORD**, **AFAGHX_SMOKE_TENANT_ID**).

Values must be read and validated in the real provider/host account and stored only in protected GitHub Environment configuration. Do not paste them into PRs, source files, or comments.

The deployment contract expects an A record for **api** → the exact configured AFAGHX_DEPLOY_HOST public IPv4, initially DNS-only. Do not publish AAAA unless IPv6 is genuinely routed and firewalled. The existing candidate deployment workflow compares the public A result against AFAGHX_DEPLOY_HOST and fails closed on mismatch.

### 3. Establish the Experience/edge destination for every declared host

The canonical registry names the 18 entrypoints, but the source of truth does not yet identify an approved hosting target for every role-module hostname. The domain owner/hosting operator must choose and provision the actual edge/runtime services and record their DNS targets in the provider console. The DNS manifest **infra/dns/required-hosts.json** intentionally keeps these target values as **UNVERIFIED_NOT_PUBLISHABLE** until evidence from the actual provider exists.

The apex host is expected to redirect to **https://www.afaghx.com/** over HTTPS. This workflow checks the redirect; it does not create it.

## Acceptance and release rules

1. Merge the API runtime/deployment implementation only through normal independent review and passing CI; PR #258 is currently a proposal, not evidence of a deployed host.
2. Restore registration and authoritative delegation, create records using provider-derived targets, and provision the real VPS/API runtime.
3. Run **AFAGHX Production API Deploy** from **main** after the candidate deployment implementation has been reviewed and merged. Its protected live smoke must pass.
4. Run **AFAGHX Public Infrastructure Readiness** and inspect the uploaded report at the exact run/SHA. Require zero failures across RDAP, NS/SOA, all public host records, TLS and HTTPS runtime checks.
5. Re-run the deployed Chromium and Module-to-Runtime checks. Only those separate checks can provide browser/module-specific evidence.
6. Never promote an Experience module to **PROVEN** based only on a DNS record, HTTP 200, or valid certificate. The module's Core security, tenant, RBAC, tests and CI evidence remain required.

## Current truth state

Until a fresh GitHub Actions run passes against the actual provider configuration:

- Domain registration/delegation: **NOT PROVEN**
- Public DNS for required hosts: **NOT PROVEN**
- API origin and TLS: **NOT PROVEN**
- Runtime routes: **NOT PROVEN**
- Production/PROVEN release: **RED**

The repository probe can make the blocker observable and reproducible; it cannot provision or renew the domain or invent the missing hosting target.
