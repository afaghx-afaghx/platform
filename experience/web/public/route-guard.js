export const ROUTE_ACCESS = Object.freeze({
  customer: 'customer',
  business: 'business',
  supplier: 'supplier',
  factory: 'factory',
  partner: 'partner',
});

export function evaluateRouteAccess({ context, requiredRole, error } = {}) {
  if (error?.status === 401) return { state: 'authentication_required', allowed: false };
  if (error?.status === 403) return { state: 'forbidden', allowed: false };
  if (!context) return { state: 'unauthenticated', allowed: false };

  if (!requiredRole) return { state: 'authorized', allowed: true };

  const memberships = Array.isArray(context.memberships) ? context.memberships : [];
  const roles = memberships.flatMap((membership) => Array.isArray(membership.roles) ? membership.roles : []);
  return roles.includes(requiredRole)
    ? { state: 'authorized', allowed: true }
    : { state: 'forbidden', allowed: false };
}
