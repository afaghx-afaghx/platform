# Experience Boundary

Web, mobile, admin and role-specific applications are untrusted clients from the perspective of the trust model.

Experience accesses platform/domain capabilities only through approved API and application boundaries. Direct database access, embedded authorization authorities, and credential stores are forbidden.

## Executable web authentication

`experience/web` is the reference executable browser path for the four authentication stages:

1. Login UI: `public/login.html`
2. Login API: `POST /api/auth/login`
3. Browser session: HttpOnly `afx_access` + `afx_refresh` cookies
4. Protected dashboard: `/dashboard`, backed by `GET /api/auth/me`

The web runtime delegates credential verification, session creation, token rotation and revocation to AFX-CORE. State-changing requests enforce same-origin checks, login attempts are rate-limited, and security headers are applied to API and UI responses.

### Local execution

Set `AFAGHX_BOOTSTRAP_EMAIL`, `AFAGHX_BOOTSTRAP_PASSWORD` (minimum 12 characters) and optionally `AFAGHX_TENANT_ID`, then run:

```bash
cd experience/web
npm test
npm start
```

For production, `NODE_ENV=production` enables Secure cookies. The current runtime is an executable reference using the existing AFX-CORE in-memory implementation; persistence must use the approved AFX-CORE repository boundary before horizontal production deployment.
