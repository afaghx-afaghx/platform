# Gate-01 Finalization Operator Runbook

## 1. G01-20 — Real KMS/HSM

Create or authorize the protected GitHub Environment:
`production-security-kms`

Set non-secret repository/environment variables:
- `AFAGHX_AWS_ROLE_TO_ASSUME` = exact IAM role ARN
- `AFAGHX_AWS_REGION` = approved AWS region
- `AFAGHX_KMS_KEY_ID` = approved customer-managed KMS key ID/ARN

### AWS OIDC trust boundary

The IAM role trust policy must trust the GitHub OIDC provider and restrict the subject to this repository and environment:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:afaghx-afaghx/platform:environment:production-security-kms"
      }
    }
  }]
}
```

Attach only the permissions required by the evidence workflow: `sts:GetCallerIdentity`, KMS describe/rotation-status/list-rotations, `kms:Encrypt`, `kms:Decrypt`, `kms:RotateKeyOnDemand`, and the minimum CloudTrail lookup permission. Do not attach administrative IAM permissions.

### Execution

Run `.github/workflows/afx-kms-rotation-evidence.yml` manually from the protected environment. The workflow must finish successfully and produce an artifact whose manifest contains the exact candidate SHA and run ID.

Do not paste AWS credentials into GitHub, source control, artifacts or chat.

## 2. G01-17 — Controlled production abuse evidence

Create/authorize GitHub Environment:
`production-security-abuse`

Set:
- `AFAGHX_ABUSE_TEST_URL` = approved HTTPS endpoint for controlled rate-limit testing.
- `AFAGHX_ABUSE_TEST_METHOD` = `GET` or `POST`.

The target must be explicitly approved for automated security testing and must not require customer credentials or expose customer data.

Run `.github/workflows/afx-production-abuse-evidence.yml` manually. Successful closure requires observed rate-limit behavior, `429`, `Retry-After`, artifact hash and exact candidate SHA.

## 3. G01-25 — Independent external pentest

Appoint an assessor independent from the AFAGHX owner/developer account. Provide `docs/security/G01-25-PENTEST-SCOPE.md` as the minimum scope.

Before closure, store only the approved report/evidence reference in the repository; do not commit confidential client secrets or unnecessary personal data.

Required closure evidence:
- assessor identity and independence statement;
- final report;
- severity/finding register;
- remediation evidence for Critical/High findings;
- retest/closure statement;
- exact release-candidate SHA reference.

## 4. Independent review gate

The repository now contains `.github/workflows/afx-independent-review-gate.yml`. It is intentionally fail-closed and requires an `APPROVED` review from a GitHub user other than `afaghx-afaghx` on the exact current PR head.

An owner self-approval, COMMENTED review, or automated scan does not satisfy this gate.

## 5. Final Gate

Do not merge until all required checks are green and the external evidence is reviewed. Do not claim PROVEN or Production while any Gate-01 control is RED/BLOCKED.