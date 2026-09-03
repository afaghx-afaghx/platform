# AFX-CORE Audit Model

## Purpose

Audit records security, governance, compliance, and other explicitly classified consequential actions. It is not a replacement for application logs.

## Minimum event envelope

```text
id
occurred_at
actor_subject_id
actor_type
organization_id / tenant_id (when applicable)
action
resource_type
resource_id
outcome
correlation_id
request_id
metadata (governed)
```

## Outcomes

Use explicit outcomes such as `success`, `denied`, `failed`, or another controlled vocabulary defined by the audit contract.

## Integrity

Audit records should be append-oriented and access-controlled. Administrative access to audit data is itself auditable.

## Privacy

Do not place passwords, access tokens, private keys, or unnecessary sensitive payloads into audit metadata.

## Retention

Retention is policy-driven and may vary by event classification and jurisdiction. Deletion or anonymization must follow approved governance rather than ad-hoc application behavior.
