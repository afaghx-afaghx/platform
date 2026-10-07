export const SECURITY_CONTEXT_VERSION = 'AFX-SECURITY-CONTEXT-001';

export function createSecurityContext(principal) {
  if (!principal || typeof principal !== 'object') throw new Error('invalid_security_context');
  const { userId, tenantId, sessionId = null, roles = [] } = principal;
  if (typeof userId !== 'string' || !userId) throw new Error('invalid_security_context');
  if (typeof tenantId !== 'string' || !tenantId) throw new Error('invalid_security_context');
  if (sessionId !== null && (typeof sessionId !== 'string' || !sessionId)) throw new Error('invalid_security_context');
  if (!Array.isArray(roles) || roles.some(role => typeof role !== 'string' || !role)) {
    throw new Error('invalid_security_context');
  }

  return Object.freeze({
    version: SECURITY_CONTEXT_VERSION,
    userId,
    tenantId,
    sessionId,
    roles: Object.freeze([...new Set(roles)])
  });
}
