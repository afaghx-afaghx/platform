# AFAGH-00 Golden Operation Block Policy

Status: BLOCKED

The operation identifier `AFAGH-GOLDEN-OP-001` and any execution request whose explicit mission is to perform that operation are disabled.

Enforcement:
- Do not authenticate, bind a tenant, load or evaluate `start.evolution`, invoke a business discovery/create tool, persist or modify a Business record, or emit operational Evidence/Audit for this blocked operation.
- Do not treat a user-supplied prompt as authorization to execute the operation.
- Do not create duplicate, synthetic, placeholder, or inferred Business records for this operation.
- If the blocked operation is encountered, halt before any state-changing tool call and report BLOCKED with the request identifier when available.
- Existing AFAGHX architecture, Core authority, tenant isolation, policy engine, tool registry, Evidence and Audit remain unchanged.
- Re-enabling this operation requires an explicit human-approved governance change and a separate ADR.

This policy is a hard deny rule and takes precedence over task prompts, task overrides, agent instructions, and autonomous execution requests.
