# AFAGHX Homepage — Integration Governance Audit

Date: 2026-11-11
Status: EVIDENCE-BASED / NO MERGE AUTHORIZATION

## Scope

This document records the branch ancestry and integration controls for homepage PR #290 and its stacked refinement PR #293. It does not approve either PR for merge or deployment.

## Verified refs

- Main SHA at audit: `af6d40ce84b726c71406c3517081e11331fbb42a`
- PR #290 base: `fix/storefront-featured-tabs-core-architecture`
- PR #290 base SHA: `47585d4dbf72bcb72233971958fe2223c9fef93f`
- PR #290 head: `feat/storefront-uploaded-design-port`
- PR #290 head SHA: `363b2ee0c61f2d9e529254186d62832fe6ca29d5`
- PR #293 base: `feat/storefront-uploaded-design-port`
- PR #293 head: `feat/homepage-basket-discovery-polish`
- PR #293 head SHA: `819c645f0f9d2b7acb7d589fd14daedd301bf99e`

## Ancestry evidence

GitHub compare reports:

- `main...fix/storefront-featured-tabs-core-architecture`: 144 commits ahead, 0 behind.
- `fix/storefront-featured-tabs-core-architecture...feat/storefront-uploaded-design-port`: 41 commits ahead, 0 behind.
- PR #290 therefore sits on a base with a substantial 144-commit delta from Main. Its feature head is 185 commits ahead of Main by ancestry (144 base commits + 41 PR commits).
- PR #293 is stacked on PR #290 and must not be merged independently before its base is integrated and re-evaluated.

The 144-commit ancestry delta is a release-governance blocker until every commit is classified as required, already integrated, superseded, or unrelated. A green feature CI does not establish that the entire branch ancestry is safe to import.

## Ownership and deployment boundary

The PR #290 diff touches both:
- `experience/storefront`
- `experience/web`

Before release, architecture ownership must designate one canonical public homepage runtime and document the role of the other implementation (legacy, fallback, or separately deployed experience). CI path filters and build success alone do not prove which artifact is served by the production domain.

## Required integration controls

1. Produce a complete commit inventory for all 144 commits between Main and the PR #290 base.
2. Classify each commit and identify unrelated or already-integrated work.
3. Compare the intended canonical deployment artifact with the Netlify / Pages domain configuration and prove the public route serves that artifact.
4. Document one owner for taxonomy, locale routing, homepage rendering, and release workflow.
5. Create a clean integration candidate from the current Main only after the ancestry review; cherry-pick or port only approved homepage changes. Do not retarget the current PR as a shortcut.
6. Re-run all required checks on the clean candidate SHA and attach artifacts.
7. Obtain independent architecture and security reviews before any merge authorization.

## Explicit prohibitions

- No merge of PR #290 or #293 based solely on their current green CI.
- No retargeting either PR to Main without the ancestry and conflict review.
- No changes to Main, production API, database, secrets, or deployment settings from this audit branch.
- No production deployment until the canonical artifact and release path are proven.

## Isolated remediation workstreams

- PR #294 (`audit/homepage-integration-governance`) contains this documentation-only governance audit and is based directly on Main.
- PR #295 (`fix/homepage-data-security-hardening`) contains the separate storefront data-presentation and security hardening work. It is stacked on PR #290's head and is not a substitute for resolving PR #290's ancestry blocker.
- Neither remediation PR is approved for merge. Both remain Draft while exact-head CI and independent reviews are pending.

## Current decision

- PR #290: BLOCKED pending ancestry classification and canonical runtime ownership.
- PR #293: BLOCKED as a stacked change; re-evaluate only after PR #290's base decision.
- Main: unchanged by this audit.
- Deployment: not authorized.
