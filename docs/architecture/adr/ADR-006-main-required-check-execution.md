# ADR-006 — Main Branch Required-Check Execution

## Status
Proposed

## Context
Gate 1 requires evidence from the canonical Main SHA. Pull-request execution alone does not prove that the merged Main commit passed the required gates. The Contracts merge at `a71109a8fd716dfc39d78a6643dddb3e9653d47b` exposed this gap: the Main SHA had an Architecture Gate run, while Evidence, AFX-CORE Gate 01, and AFX-CORE Security had no corresponding check runs.

## Decision
The four Gate 1 required workflows must execute on pushes to `main`, in addition to their existing pull-request/manual triggers.

This change does not mark any gate green. Gate closure still requires actual successful runs, exact SHA matching, and evidence.

## Consequences
- A merged Main commit produces independently inspectable Gate 1 check runs.
- Missing post-merge evidence becomes observable instead of silently absent.
- Human merge authority remains unchanged.
- Coverage and runtime proof remain separate requirements and must not be inferred from workflow success.
