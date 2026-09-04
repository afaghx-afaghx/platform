# Authorization Decision v1

A protected operation must receive an explicit authorization decision from AFX-CORE.

## Input

- `subjectId`
- `tenantId`
- `organizationId`
- `action`
- `resourceType`
- `resourceId` (when applicable)
- `authenticationLevel`
- `membershipId`
- `policyContext`

## Output

- `decision`: `allow` | `deny`
- `reasonCode`: stable non-secret diagnostic code
- `policyVersion`: evaluated policy version
- `decisionId`: unique identifier for correlation/audit
- `evaluatedAt`: timestamp

## Rules

- Missing or invalid security context results in deny.
- Unknown actions/resources result in deny.
- Expired/revoked membership results in deny.
- Tenant mismatch results in deny.
- High-risk operations must evaluate current resource state and policy.
- The contract must never contain passwords, tokens, private keys, or other secrets.
