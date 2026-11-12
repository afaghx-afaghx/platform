# Experience Runtime Canonicalization Remediation 001

- Base: main at `af6d40ce84b726c71406c3517081e11331fbb42a`
- Scope: resolve overlapping Experience application roots and release ownership
- Status: decision required; no runtime selection made in this audit

## Verified findings

1. `experience/web/` contains 123 tracked files and is a static Node web application with `public/index.html`, bilingual UX, role pages and tests.
2. `experience/storefront/` contains 130 tracked files and is a separate Next.js application with its own home/catalog/product routes, components, API routes and package manifest.
3. `experience/module-registry.json` declares `experience/web` as the runtime baseline and test command, but the second Next.js application remains a substantial parallel Experience implementation.
4. Both roots contain storefront/home/product presentation concerns; their intended production roles, domains and deployment targets are not explicitly reconciled in the canonical registry.
5. The 36-basket homepage is being advanced through PR #296 in the static web path; this does not by itself decide the long-term role of the Next.js storefront.

## Required decision and implementation

- Produce an ADR naming the canonical public homepage runtime and the canonical commerce/storefront runtime.
- Explicitly choose one of: (a) one application with route/module boundaries; (b) two applications with strictly separate responsibilities and contracts; or (c) staged migration with a documented sunset path.
- Define route ownership, public URLs, host/subdomain mapping, API base, build/test commands, deployment workflow, rollback and observability for each retained app.
- Prevent duplicated product/catalog truth, cart/order logic, authentication, localization contracts and SEO metadata across apps.
- If both apps remain, establish a contract-tested boundary and prohibit direct cross-app database access.
- Update `experience/module-registry.json`, runtime matrix, architecture docs and deployment workflows consistently after the ADR is approved.

## Acceptance gates

- Every public route has exactly one declared owner and one release pipeline.
- Every retained application has an explicit role and API contract.
- No overlapping canonical homepage/product route is deployed without a defined redirect/canonical URL.
- Tests verify route ownership, locale parity, SEO canonical tags, API boundaries and rollback.
- Production deployment evidence identifies the exact app, artifact, SHA and public URL.

## Non-goals

- Deleting either application before the ADR and dependency audit.
- Assuming the Next.js storefront is the canonical homepage because it is larger or newer.
- Assuming the static web app is the permanent canonical storefront merely because the registry currently names it.
- Merging PR #296 or changing main as part of this decision record.
