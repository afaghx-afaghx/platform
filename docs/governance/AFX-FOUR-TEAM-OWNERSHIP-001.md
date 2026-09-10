# AFAGHX Four-Team Ownership Map

**Document ID:** AFX-FOUR-TEAM-OWNERSHIP-001  
**Version:** 1.0.0  
**Status:** PROPOSED — PENDING REVIEW

## Team 01 — Architecture & Core

| Area | Canonical paths / artifacts | Gate role |
|---|---|---|
| Architecture | `docs/architecture/` | Architecture authority |
| AFX-CORE | `core/AFX-CORE/` | Core implementation |
| Identity/AuthZ | AFX-CORE source/tests | Security semantics |
| Architecture decisions | `docs/architecture/adr/` | ADR approval |
| Core contracts | API/event/security contracts | Contract review |

## Team 02 — Platform, Reliability & DevSecOps

| Area | Canonical paths / artifacts | Gate role |
|---|---|---|
| CI/CD | `.github/workflows/` | CI enforcement |
| GitHub governance | `.github/` | Repository controls |
| Infrastructure | `infrastructure/`, `deploy/`, or future canonical IaC path | Runtime trust |
| Observability | platform observability paths | Reliability |
| Security automation | workflow/scanning configuration | Security automation |
| KMS/workload identity | infrastructure/security | Trust boundary |

## Team 03 — Domain & Product Engineering

| Area | Canonical paths / artifacts | Gate role |
|---|---|---|
| Domains | `domain/` or future bounded-context canonical paths | Domain delivery |
| Application workflows | application/domain paths | Business behavior |
| Domain persistence | owning context repository/data paths | Data ownership |
| Domain contracts | API/events | Contract compliance |

## Team 04 — Data, Intelligence & AI

| Area | Canonical paths / artifacts | Gate role |
|---|---|---|
| Data Platform | future governed data paths | Data governance |
| Analytics/BI | intelligence paths | Intelligence delivery |
| AI | `docs/ai-command-center/` and future AI implementation paths | AI governance |
| AI Command Center | `.ai/`, workflows and supporting paths | Governed AI execution |
| Evaluation/evidence | AI evidence and evaluation paths | AI verification |

## Cross-team ownership rules

- One primary owner per artifact.
- Changes crossing two or more ownership domains require co-review.
- Security-sensitive cross-team work requires Team 01 + Team 02 review.
- Domain changes that introduce data products require Team 03 + Team 04 review.
- AI changes that modify repository execution require Team 04 + Team 02 review, and Team 01 when architecture/security is affected.
- No team may create a parallel identity, authorization, tenant, session or trust foundation.

## Canonical gate ownership

| Gate class | Primary team | Co-owner |
|---|---|---|
| Architecture | Team 01 | impacted owner |
| Core security | Team 01 | Team 02 |
| Platform/security infrastructure | Team 02 | Team 01 |
| Domain readiness | Team 03 | Team 01 |
| Data/AI readiness | Team 04 | owning domain |
| Production release/security | Team 02 | Team 01 + affected owner |

## GitHub Team transition

The current repository owner is an individual account, so native Organization Team objects cannot be created here. These four teams are therefore defined as repository-level operating roles. Once the repository is transferred to an AFAGHX GitHub Organization, create these four native teams using the same names/slugs and map CODEOWNERS/reviewer policy to them.
