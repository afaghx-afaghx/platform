import type { SecurityContext, TenantContext } from "@afaghx/contracts";

export function getTenantContext(
  securityContext: SecurityContext,
): TenantContext | undefined {
  return securityContext.tenantContext;
}

export function requireTenantContext(
  securityContext: SecurityContext,
): TenantContext {
  const context = getTenantContext(securityContext);
  if (!securityContext.authenticated || !context) {
    throw new Error("Tenant context is required for this operation");
  }
  return context;
}
