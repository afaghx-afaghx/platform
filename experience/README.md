# Experience Boundary

Web, mobile, admin and role-specific applications are untrusted clients from the perspective of the trust model.

Experience accesses platform/domain capabilities only through approved API and application boundaries. Direct database access, embedded authorization authorities, and credential stores are forbidden.

## Executable web authentication

`experience/web` is the reference browser experience shell. It does **not** implement authentication APIs.

The canonical authentication path is:

```text
Browser Experience
  -> https://api.afaghx.com/v1/auth/login
  -> Gateway
  -> PersistentAfxCore
  -> PostgreSQL
  -> HttpOnly afx_access + afx_refresh cookies
  -> https://api.afaghx.com/v1/auth/context
```

The browser login UI is `public/login.html`. Its client runtime calls the canonical API directly with `credentials: 'include'`; it does not call a local `/api/*` endpoint.

The Experience shell intentionally returns `404 canonical_api_only` for `/api/*`. This is a boundary guard, not an authentication implementation.

Protected browser navigation is currently `/dashboard.html`, and its runtime verifies the authenticated context through `GET /v1/auth/context`.

### Canonical auth responsibilities

- **Experience:** presentation, form submission, API client and navigation only.
- **Gateway:** canonical HTTP routing, security boundary, CORS, cookie transport and request IDs.
- **AFX-CORE:** credential verification, identity, tenant membership, token/session rotation, revocation and authorization.
- **PostgreSQL:** durable identity, membership and session state through the approved AFX-CORE repository boundary.

No Experience module may create a second authentication authority or write directly to the database.

### Browser session contract

The canonical Gateway sets:

- `afx_access`: Secure, HttpOnly, SameSite=None access cookie.
- `afx_refresh`: Secure, HttpOnly, SameSite=None refresh cookie.

Refresh rotation is performed by `POST /v1/auth/refresh`; logout is performed by `POST /v1/auth/logout`. The browser never needs to read either cookie.

For cross-origin browser execution, the canonical runtime must be deployed with an explicit allow-list of the approved Experience origins. Wildcard credentialed CORS is not permitted.

### Local execution

Run the Experience tests with:

```bash
cd experience/web
npm test
npm start
```

The Experience server is only a presentation-shell server. It must not be treated as the canonical API runtime.

For production, authentication/session persistence must remain behind the approved AFX-CORE boundary and use the persistent repository/runtime path. The reference in-memory core remains test/bootstrap infrastructure and is not a production-readiness claim.
