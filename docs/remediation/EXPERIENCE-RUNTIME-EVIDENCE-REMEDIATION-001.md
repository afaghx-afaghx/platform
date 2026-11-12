# Experience Runtime Evidence Remediation 001

- Base: main at `af6d40ce84b726c71406c3517081e11331fbb42a`
- Scope: module runtime proof and registry consistency only
- Status: remediation scope established; implementation/evidence pending

## Verified findings

1. `experience/module-runtime-matrix.json` declares 17 module/API entrypoints; all 17 have `Runtime.observed_state = UNPROVEN`.
2. The matrix references `.github/workflows/module-runtime-gate.yml`, but that workflow file is absent from the audited main tree (16 workflow files observed).
3. Canonical registry host for Services is `https://services.afaghx.com`; `experience/modules/service/README.md` still declares `https://service.afaghx.com`.
4. The Services matrix maps the runtime entrypoint to `experience/web/public/partner.html`, which does not identify a dedicated Services experience.
5. Supplier and Factory matrix rows reference `supplier.html` and `factory.html`; presence of those files is not host/TLS/API/security proof.
6. API Spine is a Platform/Gateway boundary, not a role dashboard and not an independent authentication authority.

## Required implementation

- Implement the missing matrix gate or update the matrix to the actual canonical workflow path.
- Validate registry cardinality, unique IDs/hosts, host-to-entrypoint mapping and canonical Services naming.
- Add a fail-closed probe for every module URL: DNS/TLS, HTTP status, served identity, canonical API base, and response identity.
- Bind evidence to exact commit SHA and workflow run; store raw probe output as artifacts.
- Do not mark a module PROVEN from a repository README, static HTML file, or workflow syntax test alone.
- Keep AFX-CORE as the only identity/authentication/authorization/tenant/policy authority.
- Correct the Services entrypoint only after confirming the intended public host and application route.

## Acceptance gates

- All 17 matrix rows have a real, individually probed URL or an explicit NOT_DEPLOYED state.
- No row is silently treated as PROVEN when the host is unavailable or returns the wrong application.
- Tests cover host uniqueness, manifest/matrix consistency, missing workflow references and failure cases.
- CI gate fails closed and publishes evidence with SHA/run URL.
- No main/deployment changes are made from this branch.

## Non-goals

- Building all 17 dashboards in this branch.
- Inventing or provisioning public subdomains.
- Creating separate authentication or database authorities.
- Changing the five-layer architecture or domain ownership.

## Dependencies

- Canonical layer reconciliation remains tracked by PR #291.
- Runtime probe design must align with the existing module matrix and production-readiness evidence rules.
