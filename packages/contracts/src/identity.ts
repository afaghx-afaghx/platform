export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, "UserId">;
export type OrganizationId = Brand<string, "OrganizationId">;
export type TenantId = Brand<string, "TenantId">;
export type MembershipId = Brand<string, "MembershipId">;
export type RoleId = Brand<string, "RoleId">;
export type PermissionId = Brand<string, "PermissionId">;
export type SessionId = Brand<string, "SessionId">;

export type UserStatus = "active" | "suspended" | "disabled";
export type MembershipStatus = "active" | "suspended" | "revoked";
export type OrganizationStatus = "active" | "suspended" | "archived";

export interface User {
  readonly id: UserId;
  readonly email: string;
  readonly status: UserStatus;
  readonly createdAt: string;
}

export interface Organization {
  readonly id: OrganizationId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly status: OrganizationStatus;
}

export interface Membership {
  readonly id: MembershipId;
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly tenantId: TenantId;
  readonly roleIds: readonly RoleId[];
  readonly status: MembershipStatus;
}

export interface Role {
  readonly id: RoleId;
  readonly name: string;
  readonly permissionIds: readonly PermissionId[];
}

export interface Permission {
  readonly id: PermissionId;
  readonly resource: string;
  readonly action: string;
}

export interface TenantContext {
  readonly tenantId: TenantId;
  readonly organizationId?: OrganizationId;
  readonly membershipId: MembershipId;
  readonly userId: UserId;
  readonly roleIds: readonly RoleId[];
}

export type AuthorizationDecision = "allow" | "deny" | "challenge";

export interface SecurityContext {
  readonly authenticated: boolean;
  readonly userId?: UserId;
  readonly tenantContext?: TenantContext;
  readonly sessionId?: SessionId;
  readonly decision?: AuthorizationDecision;
}
