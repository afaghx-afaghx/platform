# AFAGHX Four-Team Ownership Map

**Document ID:** AFX-FOUR-TEAM-OWNERSHIP-001  
**Version:** 1.0.0  
**Status:** PROPOSED — PENDING ARCHITECTURE GOVERNANCE REVIEW

## Team 01 — Architecture & Core

| Area | Ownership |
|---|---|
| Architecture | `docs/architecture/` |
| AFX-CORE | `core/AFX-CORE/` |
| Identity / AuthN / AuthZ | AFX-CORE source and tests |
| ADRs | `docs/architecture/adr/` when established |
| Core contracts | API/event/security contracts |

## Team 02 — Platform, Reliability & DevSecOps

| Area | Ownership |
|---|---|
| CI/CD | `.github/workflows/` |
| Repository governance | `.github/` |
| Platform runtime | Gateway, events, queues, workflows, cache, storage, notification, scheduler, integrations |
| Infrastructure | canonical IaC/deployment paths |
| Reliability | observability, SLO/SLI, resilience and release automation |
| Security automation | scanning, secrets, KMS/HSM, workload identity |

## Team 03 — Domain & Product Engineering

| Area | Ownership |
|---|---|
| Bounded contexts | domain/application paths |
| Business workflows | owning application/domain components |
| Domain persistence | owning context repositories/data |
| Contracts | versioned API/event contracts |

## Team 04 — Data, Intelligence & AI

| Area | Ownership |
|---|---|
| Data Platform | governed data paths |
| Analytics / BI | intelligence paths |
| AI | AI implementation and architecture integration |
| AI Command Center | `.ai/`, AI workflows and supporting paths |
| Evaluation / evidence | AI evaluation and evidence contracts |

## Cross-team rules

- Every controlled artifact has exactly one primary owner.
- Cross-team changes require explicit co-review.
- Security-sensitive work requires Team 01 + Team 02 review.
- Domain changes creating governed data products require Team 03 + Team 04 review.
- AI changes affecting repository execution require Team 04 + Team 02 review; Team 01 joins when architecture/security is affected.
- No team may create a parallel identity, authorization, tenant, session or trust foundation.

## Native GitHub Team transition

The repository is currently owned by a GitHub user account, not an Organization. Native Organization Teams therefore cannot be created in this repository. These four teams are formal operating roles now; after Organization migration, create native teams with the same names and map CODEOWNERS/reviewer rules to them.
