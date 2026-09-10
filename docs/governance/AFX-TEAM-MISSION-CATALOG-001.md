# AFAGHX Four-Team Mission Catalog

**Document ID:** AFX-TEAM-MISSION-CATALOG-001  
**Version:** 1.0.0  
**Status:** PROPOSED — PENDING ARCHITECTURE GOVERNANCE REVIEW

## Team 01 — Architecture & Core

Core responsibilities: architecture integrity, AFX-CORE, identity, authentication, authorization, organization, membership, tenant context, RBAC, policy, session security and core persistence contracts.

Typical missions:

- Authentication golden path
- Durable identity/session persistence
- Authorization and tenant-isolation hardening
- Passkeys/WebAuthn
- Recovery/MFA controls
- Core audit and trust foundation

## Team 02 — Platform, Reliability & DevSecOps

Core responsibilities: gateway/platform services, CI/CD, infrastructure, observability, security automation, secrets/KMS, workload identity and release controls.

Typical missions:

- API security boundary
- Dedicated CI gate implementation
- KMS/workload identity readiness
- Observability baseline
- Deployment/reliability hardening
- Security scanning and release enforcement

## Team 03 — Domain & Product Engineering

Core responsibilities: bounded contexts and business capabilities after domain freeze is lifted by governance.

Typical missions:

- Product capability
- Commerce/order lifecycle
- Supplier/factory/service workflows
- Procurement/logistics/payment
- Partner/marketing/advertising
- Trade/certification/contract/tender

No Team 03 mission may bypass AFX-CORE authorization or create cross-context shared persistence.

## Team 04 — Data, Intelligence & AI

Core responsibilities: governed data platform, analytics, intelligence, AI integration, evaluation and AI engineering automation.

Typical missions:

- Data products and governance
- Analytics/BI foundations
- Recommendation/forecasting
- Risk/fraud intelligence
- AI evaluation and model governance
- AI Engineering Command Center missions

AI execution must remain evidence-first and subject to repository CI/gate policy.

## Cross-team mission rule

Every cross-team Mission has one DRI (Directly Responsible Individual/role) and explicitly named co-reviewers. Mission ownership does not transfer the acceptance authority of the relevant Gate.
