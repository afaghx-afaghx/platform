# AFAGHX Enterprise Operating Model

**Document ID:** AFX-ENTERPRISE-OPERATING-MODEL-001  
**Version:** 1.0.0  
**Status:** PROPOSED — PENDING ARCHITECTURE GOVERNANCE REVIEW  
**Applies to:** `afaghx-afaghx/platform`  
**Scope:** Enterprise execution, team ownership, governance, phases, gates, missions, evidence and release control

## 1. Authority

This document defines the operating structure above the project phases. Phases are execution containers; they are not the highest level of control.

The repository remains the implementation source of truth. No statement in this document changes the approved architecture baseline unless an ADR explicitly approves the change.

The current master architecture establishes the canonical AFAGHX layers and requires architecture-controlled changes to be handled through change control and review. See `docs/architecture/AFX-MASTER-ARCH-001.md`.

## 2. Enterprise hierarchy

```text
STRATEGY
  ↓
ARCHITECTURE GOVERNANCE
  ↓
ENGINEERING GOVERNANCE
  ↓
SECURITY & TRUST GOVERNANCE
  ↓
PRODUCT / DOMAIN GOVERNANCE
  ↓
DATA & INTELLIGENCE GOVERNANCE
  ↓
TEAM OPERATING MODEL
  ↓
EXECUTION PHASE
  ↓
GATE
  ↓
MISSION
  ↓
TASK
  ↓
IMPLEMENTATION
  ↓
TEST
  ↓
EVIDENCE
  ↓
REVIEW
  ↓
RELEASE
  ↓
OBSERVABILITY
  ↓
EVOLUTION
```

## 3. Non-negotiable control rules

1. Architecture is controlled independently from implementation.
2. A phase cannot override a gate.
3. A mission cannot bypass evidence requirements.
4. A green local test is not sufficient for production closure.
5. Protected-branch release requires the required CI gates and review evidence.
6. Cross-domain database writes are prohibited.
7. Identity, tenant context, authorization and trust remain centralized in AFX-CORE.
8. AI may propose or execute governed engineering work, but human owners retain approval responsibility.
9. Domain expansion remains frozen while mandatory foundation/security gates are unresolved.
10. Architecture-changing work requires an ADR before implementation.

## 4. Four-team operating model

### Team 01 — Architecture & Core

**Mission:** Preserve system integrity and build the AFX-CORE foundation.

Primary ownership:

- Master Architecture and ADRs
- AFX-CORE
- Identity
- Authentication
- Authorization
- Organization
- Membership
- Tenant Context
- RBAC
- Policy
- Session and credential security
- Core persistence boundaries
- Core API/security contracts

Primary review authority:

- Architecture decisions
- Core security semantics
- Cross-context dependency direction

### Team 02 — Platform, Reliability & DevSecOps

**Mission:** Make the platform operable, secure, observable and continuously verifiable.

Primary ownership:

- API Gateway / API Management
- Eventing / queues / workflows
- CI/CD
- Infrastructure as Code
- Deployments
- Observability
- Reliability
- Security automation
- Secret management
- KMS/HSM integration
- Workload identity
- Scanning and release controls
- GitHub governance

Primary review authority:

- Runtime and deployment trust boundaries
- CI/CD policy
- Infrastructure/security automation

### Team 03 — Domain & Product Engineering

**Mission:** Implement AFAGHX business capabilities without violating platform and core boundaries.

Primary ownership:

- Product
- Commerce
- Order
- Supplier
- Factory
- Service
- Organization domain capabilities
- Procurement
- Logistics
- Partner
- Marketing
- Advertising
- Payment
- Certification
- Contract
- Tender
- Trade
- Other approved bounded contexts

Primary review authority:

- Domain contracts
- Business workflows
- Domain persistence ownership
- Application/domain integration boundaries

### Team 04 — Data, Intelligence & AI

**Mission:** Turn governed data into analytics, decision intelligence and AI-assisted engineering without becoming a second system of record.

Primary ownership:

- Data Platform
- Data Governance
- Analytics
- BI
- Recommendations
- Forecasting
- Risk/Fraud intelligence
- Pricing/Decision Intelligence
- AI architecture integration
- AI evaluation
- AI Engineering Command Center
- Mission planning / remediation automation
- Evidence-oriented AI execution

Primary review authority:

- Data contracts
- Intelligence pipelines
- AI access boundaries
- Model/evaluation governance

## 5. Shared AI Engineering Command Center

The AI Engineering Command Center is a governed execution capability used by all four teams. It is not a substitute for team ownership.

```text
Mission
→ Analyze
→ Plan
→ Implement
→ Test
→ Evidence
→ Gate
→ PR
→ Review
→ Remediate
→ Merge
```

The human owner of the affected area remains accountable for approval and release decisions.

## 6. Decision rights

| Decision type | Primary authority | Required co-review |
|---|---|---|
| Architecture baseline | Team 01 | affected teams |
| AFX-CORE security semantics | Team 01 | Team 02 |
| CI/CD or infrastructure policy | Team 02 | Team 01 |
| Domain contract/boundary | Team 03 | Team 01 |
| Data contract / intelligence | Team 04 | owning domain team |
| AI execution policy | Team 04 | Team 01 + Team 02 |
| Production security gate | Team 02 | Team 01 |
| Release approval | Affected owner + designated governance reviewer | security/platform as required |

## 7. Repository mapping

Ownership is expressed by repository paths, documents, CI jobs, gate owners and review policy. Until the repository is owned by a GitHub Organization, the four teams are treated as **virtual operating teams** in the repository governance model.

When AFAGHX moves under an Organization, these role names are intended to map directly to real GitHub Teams without changing the architecture model.

## 8. Escalation

A team must escalate when:

- it needs to violate a layer boundary,
- it needs shared persistence across bounded contexts,
- it changes authentication or authorization semantics,
- it changes a public API/event contract incompatibly,
- it introduces a new cryptographic trust boundary,
- it changes deployment trust assumptions,
- or it cannot produce required evidence.

The default decision is **STOP and escalate**, not silently bypass.

## 9. Definition of DONE

A work item is DONE only when its acceptance criteria, automated tests, CI verification and required evidence are complete, the responsible owner has reviewed it, and no higher-level gate remains violated.

## 10. Current foundation status

Gate 01 remains RED/OPEN while mandatory controls are unresolved. This operating model does not weaken or bypass the existing domain freeze.
