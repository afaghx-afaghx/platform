# AFX-CORE Identity Runtime

Framework-neutral security kernel for AFAGHX.

## Request security pipeline

`Token verification → SecurityContext → tenant boundary → PolicyEngine → resource state → audit`

The kernel intentionally does not own HTTP, database, or external IdP concerns. Adapters must be implemented around these contracts so AFX-CORE remains the single security authority.

### Token policy

- Access tokens are short-lived JWTs.
- Verification requires trusted issuer, audience, signature and explicit allowed algorithms.
- Refresh tokens are opaque random secrets and only SHA-256 digests are persisted.
- Refresh-token rotation must be atomic; reuse detection revokes the complete token family.
- No token, private key, password, or production secret belongs in Git.
