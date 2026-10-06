# AFX-AI-ASTRA-001 — GPT-6 Astra Control Contract

**Status:** DRAFT / CONTROLLED VALIDATION  
**Version:** 1.0  
**Owner:** AFAGHX AI Control Plane  
**Canonical repository:** afaghx-afaghx/platform  
**Branch:** feat/afx-ai-astra-001

## 1. Purpose

Define the controlled integration boundary for GPT-6 Astra as an advanced intelligence engine inside AFAGHX.

Astra is an intelligence provider. It is not the owner of identity, tenant context, authorization, policy, business truth, persistence, governance, or production state.

## 2. Non-negotiable architecture

`Contract → Router → Boundary → Permissions → Evidence → Local Validation → GitHub Gate → Controlled Production`

Dependency authority remains:

`Contracts → Shared Kernel → Core → Gateway → Domain → Resource State`

AI must not create a reverse dependency from Domain/Core to a model provider.

## 3. Authority model

| Concern | Authoritative layer | Astra |
|---|---|---|
| Identity | AFX-CORE | consumer |
| Authentication | Gateway/Core | consumer |
| Authorization | Core Policy | consumer |
| Tenant context | SecurityContext | consumer |
| Business truth | Domain/Core/Data | consumer |
| Persistence | PostgreSQL | no direct access |
| Governance | Constitution/Gates | no override |
| Evidence | Evidence pipeline | producer/consumer |
| Reasoning | AI Control Plane | primary capability |

## 4. Model Router contract

The application must call an abstract model capability, never a provider-specific function from Domain code.

Example capability classes:

- `reasoning.primary`
- `reasoning.fast`
- `coding.primary`
- `vision.primary`
- `agent.planning`

The router may select GPT-6 Astra or another approved model according to policy, capability, cost, latency, availability, and evidence requirements.

Domain code must not contain `callAstra()`, provider credentials, or provider-specific routing logic.

## 5. Tool Boundary

Astra may interact with AFAGHX only through explicitly registered and policy-checked tools.

Required sequence:

`SecurityContext → Policy → Tool Registry → Tool Execution → Evidence → Audit`

Direct access is prohibited to:

- PostgreSQL
- production secrets
- raw credentials
- private keys
- GitHub write authority outside approved workflow tools
- policy configuration
- unrestricted network resources
- production deployment controls

## 6. Permission matrix

| Capability | Default |
|---|---|
| Read approved context | ALLOW |
| Analyze | ALLOW |
| Reason | ALLOW |
| Plan | ALLOW |
| Generate code | ALLOW |
| Run approved tests | ALLOW |
| Inspect approved runtime/browser state | ALLOW |
| Create evidence | ALLOW |
| Propose repository change | ALLOW |
| Create PR through controlled workflow | CONDITIONAL |
| Merge PR | DENY |
| Production deploy | DENY |
| Modify Core policy | DENY |
| Access secrets | DENY |
| Direct database mutation | DENY |
| Bypass Gateway/Policy | DENY |
| Override SecurityContext | DENY |

Conditional operations require explicit workflow gates and machine-verifiable evidence.

## 7. Evidence contract

Every material AI action that can affect code, configuration, security, data, or production state must produce structured evidence containing at minimum:

- `run_id`
- `model`
- `capability`
- `input_context_hash` where applicable
- `tool`
- `authorization_decision`
- `action`
- `result`
- `test_results`
- `artifact_refs`
- `timestamp`
- `status`

Evidence must distinguish:

- `LOCAL_VALIDATED`
- `CI_VALIDATED`
- `RUNTIME_VALIDATED`
- `PROVEN`

**Local validation MUST NOT claim PROVEN.**

## 8. Safety and failure behavior

Default behavior is fail-closed.

If identity, tenant context, authorization, policy, tool registration, evidence, or required tests are missing or invalid:

`DENY → RECORD EVIDENCE → AUDIT`

No silent fallback may weaken a security boundary.

## 9. Validation stages

### Stage A — Local / Zero-Cost

Validate:

- schema
- router contract
- permission matrix
- deny rules
- evidence schema
- mock provider behavior
- deterministic contract tests

Expected state:

`LOCAL_VALIDATED`

This stage cannot promote Astra to Production.

### Stage B — GitHub Gate

Required gates include:

- tests
- architecture/dependency checks
- security checks
- evidence checks
- governance checks
- no secrets in repository
- no unauthorized direct tool/data access

Expected state:

`CI_VALIDATED`

### Stage C — Controlled Production

Promotion requires:

- approved model/provider configuration
- approved secrets management
- runtime evidence
- policy enforcement evidence
- audit evidence
- rollback path
- FINAL GATE

Only then may the integration be marked:

`PROVEN`

## 10. AI Control Plane responsibilities

The AI Control Plane owns orchestration:

`Mission → Intent → Plan → Tool Selection → Execution → Verification → Evidence → Gate`

It does not own business truth.

## 11. Engineering use cases

Initial approved Astra use cases:

1. Repository architecture analysis
2. Code generation under PR workflow
3. Test generation and diagnosis
4. Browser/runtime inspection in controlled environments
5. UI/UX quality analysis
6. AI Search intent interpretation
7. B2B matching and decision support
8. Procurement workflow planning
9. Trust/evidence interpretation
10. Engineering remediation proposals

## 12. Explicit non-goals

This contract does not authorize:

- autonomous production mutation
- autonomous merging
- unrestricted computer control
- direct database ownership
- secret discovery or extraction
- bypassing AFAGHX governance
- replacing AFX-CORE
- replacing Gateway enforcement
- treating model output as evidence of business truth

## 13. Promotion rule

Astra integration is promoted only when the complete chain is machine-verifiable:

`Contract → Router → Boundary → Permissions → Evidence → Local Validation → GitHub Gate → Runtime Evidence → FINAL GATE`

**FINAL GATE = PROVEN**

Until then, the integration remains **CONTROLLED / NOT PROVEN**.
