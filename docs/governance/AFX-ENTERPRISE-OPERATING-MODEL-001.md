# AFAGHX Enterprise Operating Model

**Document ID:** AFX-ENTERPRISE-OPERATING-MODEL-001  
**Version:** 1.0.1  
**Status:** PROPOSED — PENDING ARCHITECTURE GOVERNANCE REVIEW  
**Applies to:** `afaghx-afaghx/platform`  
**Scope:** Enterprise strategy, governance, team ownership, phases, gates, missions, quality, evidence, release and evolution

## 1. Authority

This document defines the operating model above the project phases. Phases are execution containers; they are not the highest level of control.

The repository remains the implementation source of truth. No statement in this document changes the approved architecture baseline unless an ADR explicitly approves the change.

## 2. The correct control model

Teams are **not a serial layer above phases**. They are an organizational ownership dimension that cuts across phases.

```text
                         STRATEGY
                            ↓
                  GOVERNANCE / CONTROL PLANES
          ┌─────────────────┼─────────────────┐
          │                 │                 │
   Architecture       Engineering       Security/Trust
   Product/Domain     Data/Intelligence  Quality/Release
          └─────────────────┼─────────────────┘
                            ↓
                    PHASE / CAPABILITY
                            ↓
                         GATE
                            ↓
                        MISSION
                            ↓
                          TASK
                            ↓
                     IMPLEMENTATION
                            ↓
                 TEST / SECURITY / QA
                            ↓
                        EVIDENCE
                            ↓
                         REVIEW
                            ↓
                    RELEASE DECISION
                            ↓
                      OBSERVABILITY
                            ↓
                  FEEDBACK / EVOLUTION
```

The four teams overlay this execution system and provide ownership, DRI assignment and required co-review. They do not become a gate that work must "pass through" merely because of team membership.

## 3. Four-team operating model

### Team 01 — Architecture & Core

Owns master architecture, ADRs, AFX-CORE, identity, authentication, authorization, organization, membership, tenant context, RBAC, policy, session security, core persistence boundaries and core contracts.

### Team 02 — Platform, Reliability & DevSecOps

Owns platform services, API gateway, eventing, CI/CD, infrastructure, observability, reliability, security automation, secrets, KMS/HSM integration, workload identity, scanning and release controls.

### Team 03 — Domain & Product Engineering

Owns approved bounded contexts and business capabilities: Product, Commerce, Order, Supplier, Factory, Service, Procurement, Logistics, Payment, Partner, Marketing, Advertising, Certification, Contract, Tender, Trade and future approved contexts.

### Team 04 — Data, Intelligence & AI

Owns Data Platform, Data Governance, Analytics, BI, Recommendation, Forecasting, Risk/Fraud intelligence, Pricing/Decision Intelligence, AI integration, AI evaluation and the AI Engineering Command Center.

## 4. Team status

The current repository is owned by the `afaghx-afaghx` GitHub user account rather than an Organization. Therefore the four teams are currently **virtual operating teams**, represented by this ownership model and review rules. They must not be misrepresented as native GitHub Organization teams.

After migration to an AFAGHX GitHub Organization, the four roles should map directly to native teams without changing the ownership model.

## 5. Shared AI Engineering Command Center

The AI Engineering Command Center is a governed execution capability shared by the four teams:

`Mission → Analyze → Plan → Implement → Test → Evidence → Gate → PR → Review → Remediate → Merge`

AI may assist or execute within policy, but human owners retain approval and release accountability.

## 6. Decision rights

| Decision | Primary authority | Required co-review |
|---|---|---|
| Architecture baseline | Team 01 | affected teams |
| AFX-CORE security semantics | Team 01 | Team 02 |
| Platform/infrastructure policy | Team 02 | Team 01 |
| Domain boundary/contract | Team 03 | Team 01 |
| Data/intelligence contract | Team 04 | owning domain |
| AI repository execution policy | Team 04 | Team 02; Team 01 when architecture/security changes |
| Production security gate | Team 02 | Team 01 |
| Release approval | affected owner + governance | security/platform as required |

## 7. Non-negotiable rules

- One primary owner per controlled artifact.
- Cross-team changes require named co-reviewers.
- No parallel identity/session/authorization/trust foundations.
- No cross-domain database writes.
- Architecture-changing work requires an ADR before implementation.
- A failed required control blocks release.
- Gate completion requires evidence; progress percentage never substitutes for acceptance.

## 8. Definition of DONE

DONE requires acceptance criteria, deterministic tests, CI verification, required evidence, responsible-owner review and compliance with higher-level governance. A passing local test alone is not DONE.

## 9. Current foundation status

Gate 01 remains RED/OPEN and the domain freeze remains active. This operating model does not bypass, weaken or reclassify existing Gate-01 controls.
