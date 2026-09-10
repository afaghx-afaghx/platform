# AFAGHX Four-Team Mission Catalog

**Document ID:** AFX-TEAM-MISSION-CATALOG-001  
**Version:** 1.0.0  
**Status:** PROPOSED — PENDING ARCHITECTURE GOVERNANCE REVIEW

## Team 01 — Architecture & Core

Owns architecture integrity and AFX-CORE: Identity, Authentication, Authorization, Organization, Membership, Tenant Context, RBAC, Policy, Session/Credential Security, Audit, Trust and core persistence contracts.

Typical missions: authentication golden path; durable identity/session persistence; authorization and tenant isolation; passkeys/WebAuthn; MFA/recovery; core audit/trust hardening.

## Team 02 — Platform, Reliability & DevSecOps

Owns platform runtime, API boundary, CI/CD, infrastructure, observability, reliability, security automation, secrets/KMS, workload identity and release controls.

Typical missions: API security boundary; dedicated CI gates; KMS/workload identity readiness; observability baseline; deployment/reliability hardening; security scanning and release enforcement.

## Team 03 — Domain & Product Engineering

Owns approved bounded contexts and business capabilities after the domain freeze is lifted by governance.

Typical missions: Product; Commerce/Order; Supplier/Factory/Service; Procurement/Logistics/Payment; Partner/Marketing/Advertising; Trade/Certification/Contract/Tender.

No Team 03 mission may bypass AFX-CORE authorization or create cross-context shared persistence.

## Team 04 — Data, Intelligence & AI

Owns governed Data Platform, analytics, intelligence, AI integration/evaluation and the AI Engineering Command Center.

Typical missions: data governance/products; analytics/BI; recommendation/forecasting; risk/fraud intelligence; AI model/evaluation governance; governed AI engineering missions.

## Cross-team mission rule

Each cross-team Mission has one DRI, named co-reviewers, dependencies, evidence requirements and a linked Gate. Mission ownership does not transfer Gate acceptance authority.
