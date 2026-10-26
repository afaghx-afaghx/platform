# Production Platform Runtime Contract

**Scope:** AFX-PLATFORM / Gateway runtime
**Canonical flow:** `Gateway → PersistentAfxCore → PostgreSQL`

## Runtime entrypoint

Production starts from:

`node platform/Gateway/server.mjs`

The entrypoint:

1. validates runtime configuration;
2. requires TLS for PostgreSQL in `NODE_ENV=production`;
3. requires an explicit non-empty allowed-origin policy in production;
4. creates the canonical Gateway runtime;
5. runs AFX-CORE PostgreSQL migration before listening;
6. exposes graceful SIGTERM/SIGINT shutdown.

## Container artifact

The repository-root `Dockerfile` builds the Gateway runtime with:

- Node 22;
- locked AFX-CORE dependencies;
- AFX-CORE, Gateway, Search, product and domain runtime sources;
- non-root `node` user;
- port 8080.

## Live evidence contract

The protected `production-platform` environment must provide:

- `AFAGHX_API_BASE_URL` — canonical HTTPS API base;
- `AFAGHX_ALLOWED_ORIGIN` — exact browser origin;
- `AFAGHX_SMOKE_EMAIL` — dedicated non-customer smoke identity;
- `AFAGHX_SMOKE_PASSWORD` — dedicated smoke credential;
- `AFAGHX_SMOKE_TENANT_ID` — dedicated smoke tenant.

The live smoke gate verifies:

- HTTPS/TLS 1.2+ connectivity;
- Gateway health identity;
- HSTS and security headers;
- allowed and denied CORS behavior;
- unauthenticated request rejection;
- authentication and SecurityContext tenant resolution.

The live environment is **UNPROVEN** until this protected workflow completes successfully and its artifact is reviewed against the exact candidate SHA.

## Current limitation

The repository currently contains no deployment/IaC definition or externally verified live endpoint evidence. Therefore this contract does not claim Production/LIVE readiness by itself.
