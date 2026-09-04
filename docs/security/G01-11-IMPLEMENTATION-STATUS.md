# G01-11 Implementation Status

**Status: IMPLEMENTED — CI/EVIDENCE VERIFICATION IN PROGRESS**

The implementation remains isolated on `feat/g01-11-http-api-security-boundary` and is not merged to `main`.

## Verification objective

Close G01-11 only after repository-verified evidence demonstrates:

1. HTTP Bearer credential parsing delegates to the existing AFX-CORE authentication contract.
2. Invalid, expired, revoked, missing, and malformed credentials are rejected with HTTP 401.
3. Authorization and tenant-boundary decisions delegate to the existing AFX-CORE authorization contract.
4. Tenant mismatch and denied permissions are rejected with HTTP 403.
5. The returned security context contains no raw credential material.
6. Deterministic integration tests pass in GitHub Actions.
7. The security workflow publishes a reviewable evidence artifact.

## Current evidence state

- Implementation: present on this branch.
- Automated test definition: present on this branch.
- CI workflow integration: present on this branch.
- GitHub Actions execution evidence: pending verification.
- Artifact evidence: pending verification.
- Gate-01 closure: **OPEN / RED**.

No production-readiness, merge, or Gate-01 GREEN claim is made until the CI run and evidence artifact are independently verified.
