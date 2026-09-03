# AFX-CORE Identity Model

## Subject types

AFAGHX treats the following as first-class subjects:

- `person` — a human identity
- `service` — an internal service identity
- `external_principal` — a federated or external identity

## Separation of concerns

```text
Identity
  ├── stable subject identity
  ├── identifiers
  └── lifecycle

Authentication
  ├── credentials
  ├── sessions
  ├── authentication factors
  └── assurance context

Organization
  ├── organization
  └── tenant boundary

Membership
  └── subject ↔ organization relationship
```

Identity does not own passwords, access roles, or domain profiles.

## Identifier policy

Stable internal IDs must not encode mutable business information. Human-readable handles are aliases and may change without changing the canonical subject ID.

## Lifecycle

Identity lifecycle should explicitly support creation, activation, suspension, deactivation, and controlled deletion/anonymization according to legal and operational requirements.

## Privacy

Collect only attributes required for a declared purpose. Sensitive attributes require explicit governance, access controls, retention rules, and auditability.
