# AFAGHX Ecosystem Gate Closure Contract

**Status:** EXECUTION LOCKED
**Issue:** #25
**Working branch:** `feat/ecosystem-gate-closure-2026-09-05`
**Canonical release branch:** `main`

## Purpose

This document is the release-contract for completing AFAGHX as a production ecosystem platform. It does not declare completion by itself; GitHub Actions evidence and reviewed implementation are authoritative.

## Five-layer completion order

1. **AFX-CORE** — identity, authentication, authorization, tenant context, membership, RBAC, policy, audit, consent, trust, configuration, feature flags and registry.
2. **AFX-PLATFORM** — API/gateway, events, queue, workflow, search, cache, storage, notification, webhooks, scheduler, integration, localization, currency and documents.
3. **DOMAIN** — bounded business capabilities with explicit persistence ownership and versioned contracts.
4. **INTELLIGENCE** — governed data, analytics, AI, recommendations, automation, risk and decision products.
5. **EXPERIENCE** — web, mobile, administration and role-specific applications.

## Gate state machine

`INVENTORY -> IMPLEMENT -> TEST -> SECURITY -> CI -> EVIDENCE -> INDEPENDENT REVIEW -> PR -> HUMAN REVIEW -> MERGE -> RE-OBSERVE`

Allowed final states:

- `GREEN`: every applicable control has successful execution evidence.
- `RED`: one or more controls failed.
- `UNKNOWN`: evidence is missing or unverifiable.

`UNKNOWN` is not GREEN.

## Required evidence per gate

- exact changed-file manifest
- reviewed commit SHA
- deterministic test output
- GitHub Actions run/job identifiers
- security scan results
- contract validation
- secret scan
- dependency scan
- architecture-boundary validation
- machine-readable evidence artifact
- independent security/architecture review
- pull request and human approval before merge

## Hard rules

- Never push directly to `main` for implementation work.
- Never mark a control DONE because code or documentation exists.
- Never suppress or reinterpret a failed security check as success.
- Never introduce an authentication, authorization or tenant-context silo outside AFX-CORE.
- Never allow Experience to access persistence directly.
- Never allow domains to bypass another domain's persistence boundary.
- Never commit secrets, tokens, private keys or production credentials.
- Architecture changes require an ADR.
- Destructive schema changes require a rollback plan.
- External prerequisites such as KMS/HSM environments and independent penetration testing require real evidence; they cannot be simulated.

## Current release blocker

AFX-CORE Gate 01 is currently RED/OPEN. Its closure matrix contains unresolved production controls, including KMS/HSM-backed key management and independent penetration testing. Domain Freeze therefore remains active until Gate 01 is genuinely GREEN.

## Definition of Done

The AFAGHX ecosystem is release-ready only when the final release gate is GREEN on the protected branch and the repository contains the complete implementation/test/security/CI/evidence/review chain for all applicable gates.
