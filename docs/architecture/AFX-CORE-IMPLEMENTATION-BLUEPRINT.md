# AFX-CORE Implementation Blueprint v1

## Objective

Turn the approved trust foundation into an executable, testable security core without allowing business domains to become security authorities.

## Module boundaries

```text
core/
  identity/
  authentication/
  authorization/
  organizations/
  memberships/
  tenant-context/
  audit/
  consent/
  trust/
  configuration/
  feature-flags/
  module-registry/
```

## Initial execution order

### 1. Identity

Canonical principals and identities; lifecycle states; verified contact methods; account status; security-relevant identity events.

### 2. Authentication

Credential verification, authentication methods, MFA/WebAuthn extension points, recovery, login risk controls, and session issuance.

### 3. Sessions / tokens

Short-lived access credentials plus opaque refresh credentials. Refresh credentials are high entropy, stored only as hashes, rotated on use, and linked to a session family. Reuse detection revokes the family.

### 4. Authorization

Permissions and roles are separate from authentication. Authorization evaluates subject, tenant, action, resource, and policy context. Default is deny.

### 5. Organization / membership / tenant context

Membership is the authoritative bridge between identity and organization/tenant access. Tenant context is derived and validated server-side.

### 6. Audit / consent / trust

Security-sensitive actions become immutable/auditable records. Consent is explicit and versioned. Signing keys and secrets are external to application source.

## Request pipeline

```text
HTTP request
  → transport validation
  → authentication
  → identity resolution
  → tenant-context resolution
  → membership validation
  → permission/RBAC check
  → policy evaluation
  → resource-state check
  → handler
  → audit/event emission
```

No protected handler may be reachable by bypassing this pipeline.

## Data model principles

- UUID/ULID identifiers with explicit public/private boundaries.
- Unique constraints enforce canonical identity invariants.
- Passwords are never persisted in plaintext.
- Refresh secrets are never persisted in plaintext.
- Security records have explicit timestamps and actor/context metadata.
- Tenant-owned records include an explicit tenant ownership key where applicable.
- Cross-tenant queries require deliberate, privileged paths and are audited.
- Deletion semantics distinguish deactivation, revocation, retention, and irreversible destruction.

## Testing strategy

Every module requires unit tests for domain rules. Cross-module security behavior requires integration tests. Public API and event shapes require contract tests. End-to-end tests cover registration/login, session refresh/reuse detection, logout/revocation, tenant switching, authorization denial, and sensitive audit events.

## Definition of Done

AFX-CORE is not considered implemented when files merely exist. Each capability must have executable code, persistence behavior where required, automated tests, security controls, public contracts, observability, and documentation that matches the implementation.
