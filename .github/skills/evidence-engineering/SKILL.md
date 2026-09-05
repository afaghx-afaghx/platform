---
name: evidence-engineering
description: Produce provenance-backed evidence packages for AFAGHX engineering gates.
---
# Evidence Engineering

Every claim must map to a baseline SHA, command, workflow run, test result or artifact.

Minimum package: inventory, architecture boundary result, security result, tests, contract validation, secret scan, dependency scan, changed-files manifest, review state and PR reference.

Evidence states: GREEN = successful executed evidence; RED = failed evidence; UNKNOWN = not executed/unverifiable. UNKNOWN blocks completion.
