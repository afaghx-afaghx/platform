# ADR: Disable AFAGH-GOLDEN-OP-001

- Status: Accepted
- Decision: Block AFAGH-GOLDEN-OP-001 from autonomous or governed execution.
- Scope: The exact operation identifier and execution requests explicitly invoking it.
- Reason: The operation has not been established as a canonical AFAGHX business capability with verified runtime contracts, policy registration, governed tool registration, persistence contract, Evidence/Audit implementation, and end-to-end runtime proof.
- Safety rule: No state-changing execution is permitted merely because the operation appears in a prompt.
- Re-enable condition: explicit human approval plus a new architecture/runtime/evidence review.
