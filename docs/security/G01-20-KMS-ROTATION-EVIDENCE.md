# G01-20 — KMS/HSM Rotation Evidence Contract

**Gate:** G01-20  
**Current status:** BLOCKED until real infrastructure evidence exists.

## Objective

Prove that production cryptographic material is controlled by an approved KMS/HSM boundary, accessed with short-lived workload identity, and rotated with verifiable cryptographic continuity.

## Required production evidence

1. Customer-managed symmetric KMS key (or approved HSM-backed KMS/custom key store) identity, key type, state and key policy.
2. GitHub Actions OIDC/workload identity with least-privilege IAM. Long-lived AWS access keys are prohibited.
3. Rotation status captured from `GetKeyRotationStatus`.
4. A real on-demand rotation event captured by `RotateKeyOnDemand` (where permitted).
5. `ListKeyRotations` output showing the completed key-material rotation.
6. Encrypt/decrypt continuity before and after rotation using the same logical KMS key.
7. CloudTrail/EventBridge evidence that records the rotation operation.
8. Immutable CI artifact containing the sanitized results and exact candidate SHA.

AWS KMS supports on-demand rotation for eligible customer-managed keys and provides `GetKeyRotationStatus` and `ListKeyRotations` to inspect rotation state and completed rotations. CloudTrail/EventBridge can provide rotation audit evidence.

## Fail-closed rules

- Local mocks/emulators do not close G01-20.
- Enabling automatic rotation alone does not close G01-20.
- A workflow that cannot authenticate through OIDC must fail.
- No raw credentials, key material, plaintext production secrets or access tokens may enter artifacts.
- The Gate-01 matrix remains BLOCKED until the real evidence bundle is reviewed.

## Required GitHub environment

`production-security-kms`

Required protected variables:

- `AFAGHX_AWS_ROLE_TO_ASSUME` — IAM role ARN.
- `AFAGHX_AWS_REGION` — AWS Region.
- `AFAGHX_KMS_KEY_ID` — approved KMS key ID/ARN.

The evidence workflow is deliberately manual and environment-protected so cryptographic rotation cannot happen as an ordinary pull-request side effect.