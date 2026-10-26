# AFX-DOMAIN Entity Ownership Verifier

The verifier must parse both the machine-readable ownership registry and `AFX-DOMAIN-MAP-001.md`. It fails closed on context-count, entity-count, duplicate ownership, missing context, registry-only entity, map-only entity, or any other ownership mismatch, and writes machine-readable JSON evidence before returning a non-zero exit code.
