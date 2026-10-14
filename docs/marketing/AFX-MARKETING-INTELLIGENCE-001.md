# AFX-MARKETING-INTELLIGENCE-001 — Capability Baseline

**Status:** Proposed implementation baseline  
**Version:** 1.0.0  
**Scope:** Digital-marketing capability inventory and evidence gates

## Purpose

Establish an explicit, testable inventory for AFAGHX marketing capabilities without misrepresenting planned work as implemented or production-ready. This baseline is not a replacement for the canonical architecture, AFX-CORE, API contracts, or domain ownership rules in `AGENTS.md`.

## Capability scope

The registry covers content operations, SEO, local SEO, social publishing, analytics and attribution, consent-based email lifecycle marketing, visual content workflows, paid media, marketing automation, CRM/leads, affiliate growth, conversion optimization, reputation management, product/service feeds, international localization, and privacy governance.

The registry starts with every capability marked `planned`. This is deliberate: repository presence and a design image are not implementation evidence.

## Architectural constraints

- Marketing is a business capability; it must not become a second identity, authorization, tenant, consent, or audit authority.
- Protected operations must use the canonical gateway and AFX-CORE security context, permissions, policy and audit facilities.
- Tenant isolation must be enforced server-side for records, events, jobs, cache keys, analytics, exports and integrations.
- Intelligence/AI may consume approved contracts, events and governed data products; it must not bypass domain ownership or directly mutate another domain's persistence.
- External advertising/social/email providers are adapters behind explicit, versioned contracts. Credentials remain in approved secret stores; never commit tokens or API keys.
- Marketing messages must respect recorded consent, unsubscribe/suppression state, purpose limitation and applicable retention rules.
- Campaign execution, attribution and commission-affecting actions require idempotency and auditable provenance.
- Production status fails closed: no operational claim without linked PR/commit, test run and live smoke evidence.

## Evidence status contract

| Status | Minimum evidence |
|---|---|
| `planned` | Scope and owner recorded; no implementation claim |
| `implemented` | Reviewed implementation PR and commit |
| `tested` | Implementation evidence plus passing automated test run |
| `operational` | All prior evidence plus a successful live-runtime smoke result |

The validator at `scripts/marketing/validate_registry.py` enforces required evidence fields and rejects duplicate IDs or unsupported statuses. It validates metadata only; it does not verify that external links are genuine or that a service is live.

## Required implementation sequence

1. Inspect existing domain, route, API, persistence, authorization and test conventions before creating duplicate modules.
2. Select one vertical slice: consent-aware campaign/lead event ingestion and analytics contracts, with tenant isolation and audit coverage.
3. Implement the contract, persistence ownership, authorization and tests in the repository's established stack.
4. Add provider adapters only after contracts and secrets boundaries are approved.
5. Prove behavior in CI and a controlled runtime before changing registry status.
6. Run architecture/security review and score the change against the 10-point rubric; any score below 9 blocks acceptance and requires remediation.

## Initial scoring rubric

- Architecture and dependency direction: 2 points
- Tenant isolation, authorization, privacy and audit: 2 points
- Correctness and error/fail-closed behavior: 2 points
- Automated test quality and reproducibility: 2 points
- Evidence, documentation and operability: 2 points

A score of 9/10 is the minimum acceptance threshold, but a high score never substitutes for required evidence or CI results.
