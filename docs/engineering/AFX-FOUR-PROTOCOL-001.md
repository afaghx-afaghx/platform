# AFX-FOUR-PROTOCOL-001 — Mandatory Engineering Finalization

Status: Mandatory engineering policy. AGENTS.md remains the supreme repository constitution.

## Required four protocols

1. AUDIT FIRST. Read AGENTS.md, relevant architecture and ADRs, code, tests, workflows and real current evidence. Define a single bounded task; record base/head SHA, exact changed-file scope, findings and risk.
2. SCORE THE IMPLEMENTATION. Score all ten dimensions as 0, 0.5 or 1 with evidence per dimension: architecture/scope; functional correctness; security boundaries; positive/negative tests; failure/edge handling; data integrity/concurrency; observability/audit; operations/rollback; CI reproducibility; documentation/maintainability. The total is calculated, never hand-entered.
3. REMEDIATE AND RESCORE. An initial score at or below 9/10 forbids finalization. Fix the findings, create a different code commit, rerun tests and CI, and score all ten dimensions again. Repeat until strictly greater than 9/10 (9.5 is the minimum attainable passing score). If a genuine external blocker remains, report BLOCKED instead of fabricating success.
4. FINALIZE WITH EVIDENCE. A technical candidate requires the final rubric, tests and contract CI to pass on their cited commits, all critical/high findings closed, no blocked findings, and SHA-bound evidence. A production/PROVEN release additionally requires independent human approval and actual live-production evidence. This automation is not a substitute for semantic review or approval.

## Report contract

The PR description must include JSON between these exact markers:

<!-- AFX-FOUR-PROTOCOL-REPORT-JSON
PASTE THE COMPLETE JSON OBJECT HERE
-->

Required fields: schema_version, task (id, scope, repository, pull_request_number, base_sha, head_sha), audit (completed, changed_files, findings), assessments (stage, commit_sha, rubric, tests, ci), and final (decision, independent_review, production_status, evidence_artifacts). See scripts/engineering/validate-four-protocol.mjs for the machine-enforced fields and scoring rules. The validator verifies that cited GitHub Actions runs belong to this PR, assessed commit SHA and required workflow; it does not prove evidence claims are truthful. CI must fail closed on missing/invalid reports, a final score <=9, stale SHAs, a copied report, unresolved critical/high findings or any blocker.

A technical candidate is not a production release. The machine gate cannot approve its own deployment. Never label this system PROVEN while independent review or live evidence is missing.
