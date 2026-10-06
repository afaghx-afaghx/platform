# AFAGHX Architecture

The supreme repository rules are in `AGENTS.md`.

## Seven layers
1. AFX-CORE — identity and trust foundation.
2. AFX-PLATFORM — shared technical platform capabilities.
3. DOMAIN — bounded business capabilities with explicit data ownership.
4. INTELLIGENCE — governed data, analytics, BI, and AI.
5. EXPERIENCE — user-facing applications, including the 17 controlled modules.
6. INFRASTRUCTURE — runtime and operational support.
7. ENGINEERING & GOVERNANCE — contracts, tests, docs, CI/CD, IaC, ADRs, and change control.

## Request flow
`Authentication → Identity → Tenant Context → Membership → RBAC → Policy → Resource State`

## Dependency direction
`EXPERIENCE → PLATFORM / DOMAIN → CORE`

Intelligence consumes approved contracts, events, and governed data products. Infrastructure provides runtime support and never owns business truth.

## Boundary rules
No direct Experience-to-database path. Domains own their persistence and do not access another domain's persistence directly. CORE is the sole authority for identity, authentication, authorization, tenant context, membership, policy, audit, consent, and trust primitives.
