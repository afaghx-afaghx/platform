# AFAGHX Production API Deployment Contract v1.0

Status: **implementation contract — not a LIVE/PROVEN claim**

## Target topology

This repository uses a vendor-neutral Linux VPS deployment contract for the canonical API runtime:

`Internet → Caddy (80/443, automatic HTTPS) → Gateway (private container network) → PersistentAfxCore → PostgreSQL over TLS`

The VPS must have a stable public IPv4 address. PostgreSQL is an external persistent PostgreSQL service that supports TLS; the deployment does not create a disposable database container. Gateway startup runs the Core migrations before the listener becomes available. Caddy persists certificate/configuration state in named Docker volumes.

## DNS contract

Create an `A` record:

- Name: `api`
- Zone: `afaghx.com`
- Value: the **actual static public IPv4 assigned by the selected VPS provider**
- TTL: provider default or 300 seconds
- During initial provisioning, use DNS-only mode so the workflow can verify that the hostname resolves directly to the configured deployment IP and Caddy can obtain its certificate.

Do not copy an example IP from documentation. Do not publish an `AAAA` record unless IPv6 is configured, routed, and firewalled on the same host. The deployment workflow fails closed if `api.afaghx.com` does not resolve to the configured deployment IPv4. If the domain is intentionally behind a proxy/CDN, the DNS verification policy must be adapted in a reviewed change; do not disable the check just to get a green result.

## VPS prerequisites

Use a supported Ubuntu/Debian Linux host with a static public IPv4, Docker Engine and the Docker Compose plugin. Set up a dedicated non-root deploy user with key-only SSH access, permission to write `/opt/afaghx`, and permission to run Docker without an interactive password prompt. Make ports 80 and 443 reachable from the Internet. Restrict SSH ingress to a trusted source/range or a controlled runner wherever possible; do not enable password SSH or root SSH login.

Prepare these directories with ownership assigned to the deploy user:

- `/opt/afaghx/releases`
- `/opt/afaghx/shared`

A release is stored under `/opt/afaghx/releases/<commit>-<run-id>`; `/opt/afaghx/current` points to the active release. Docker Compose project name is `afaghx-production`. The environment file is permissioned `0600` and is never committed to Git. Releases retain their own restricted environment file so rollback restores the matching application/configuration pair.

## GitHub Environment: `production-platform`

Configure the following **Variables** using values from the actual hosting/domain settings.

| Variable | Required value |
|---|---|
| `AFAGHX_DEPLOY_HOST` | Static public IPv4 of the VPS (not an assumed address) |
| `AFAGHX_DEPLOY_USER` | Dedicated non-root SSH user |
| `AFAGHX_DEPLOY_PORT` | SSH port, normally `22` |
| `AFAGHX_API_BASE_URL` | `https://api.afaghx.com` |
| `AFAGHX_ALLOWED_ORIGIN` | Canonical experience origin, normally `https://www.afaghx.com` |
| `AFAGHX_ACME_EMAIL` | Monitored email address for certificate notices |

Configure these **Secrets** in the same Environment.

| Secret | Purpose |
|---|---|
| `AFAGHX_DEPLOY_SSH_PRIVATE_KEY` | Private key for the dedicated deploy user |
| `AFAGHX_DEPLOY_KNOWN_HOSTS` | Independently verified SSH host-key line for the target host/port |
| `AFAGHX_PRODUCTION_DATABASE_URL` | URL for the real persistent PostgreSQL database with URL-encoded credentials and TLS support |
| `AFAGHX_SMOKE_EMAIL` | Dedicated non-human test account |
| `AFAGHX_SMOKE_PASSWORD` | Password for that test account |
| `AFAGHX_SMOKE_TENANT_ID` | Tenant ID for the dedicated smoke account |

Verify the host-key fingerprint out of band before storing `AFAGHX_DEPLOY_KNOWN_HOSTS`. Do not generate trust on the runner with an unauthenticated `ssh-keyscan`. Keep test credentials least-privileged and isolated to the smoke tenant. Never paste secret values into PR comments or source files.

The production database URL must point to an actual database reachable from the VPS. The application is configured with `DATABASE_SSL=true` and certificate verification remains enabled by default. Do not use a local, mock, or ephemeral database for production.

## Deployment and proof sequence

1. Merge the reviewed runtime/deployment PR through the required repository gates; do not deploy an unmerged feature branch.
2. Configure the VPS, DNS A record, GitHub Environment Variables, Secrets, and required reviewer protection.
3. Run **AFAGHX Production API Deploy** manually from `main`. The workflow validates configuration and DNS before changing the host.
4. It packages the exact commit, deploys into a versioned release directory, switches the active symlink, starts Docker Compose, and waits for local container health.
5. It verifies live HTTPS, the Core health payload, security headers, allowed/denied CORS, login, and tenant SecurityContext. A failed post-deploy smoke attempts to roll back to the previous release; if no known-good release exists, it stops the unproven first deployment.
6. Inspect the run log and retained evidence artifact. A successful deployment workflow is required but is not, by itself, permission to call every module LIVE/PROVEN or to bypass the separate FINAL GATE.

## Rollback boundary

The workflow retains prior versioned releases and keeps a `current` symlink for the active release. Rollback restores the previous release and its matching environment file. Database schema migrations must remain backward compatible across the rollback window; destructive migrations still require a separate reviewed migration/restore strategy.

## Operational owner actions not performed by repository code

A repo change cannot provision a paid VPS, know its allocated IPv4, create a DNS record in an unconnected DNS account, or invent production database/smoke credentials. Those values must be supplied by the owner from the real provider consoles. Until that is done and a fresh run succeeds, the gate remains **BLOCKED / RED**.
