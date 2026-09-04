import crypto from 'node:crypto';

const PUBLIC_CREDENTIAL_ERROR = 'Invalid authentication credentials';

export function createHttpSecurityBoundary({ validateAccessToken, authorize }) {
  if (typeof validateAccessToken !== 'function') {
    throw new TypeError('validateAccessToken must be a function');
  }
  if (typeof authorize !== 'function') {
    throw new TypeError('authorize must be a function');
  }

  return async function authenticateAndAuthorize(request, resource) {
    const authorization = request?.headers?.authorization;
    if (typeof authorization !== 'string' || !/^Bearer\s+\S+$/i.test(authorization)) {
      return { ok: false, status: 401, error: PUBLIC_CREDENTIAL_ERROR };
    }

    const token = authorization.replace(/^Bearer\s+/i, '');
    const securityContext = await validateAccessToken(token);
    if (!securityContext?.authenticated) {
      return { ok: false, status: 401, error: PUBLIC_CREDENTIAL_ERROR };
    }

    const decision = await authorize({
      subjectId: securityContext.subjectId,
      tenantId: securityContext.tenantId,
      membershipId: securityContext.membershipId,
      permissions: securityContext.permissions ?? [],
      resource,
    });

    if (!decision?.allowed) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }

    return {
      ok: true,
      status: 200,
      securityContext: {
        subjectId: securityContext.subjectId,
        tenantId: securityContext.tenantId,
        membershipId: securityContext.membershipId,
        permissions: securityContext.permissions ?? [],
      },
    };
  };
}

export function redactCredential(value) {
  if (value == null) return value;
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
