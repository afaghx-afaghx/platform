# Database Schema

This directory is the canonical home for database schema definitions and ownership records.

## Rules

- Every schema object must have an owning bounded context.
- AFX-CORE owns only its canonical identity/trust foundation.
- Business domains own their own business tables.
- Shared database objects must have an explicit architecture decision.
- Foreign-key or query coupling across bounded contexts must not become an implicit cross-domain write path.
- Security-sensitive tables must document tenant isolation and audit expectations.

This foundation PR establishes the home and rules only; it does not fabricate domain tables.
