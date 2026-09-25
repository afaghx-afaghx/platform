import type {
  MembershipId,
  OrganizationId,
  PermissionId,
  RoleId,
  TenantId,
  UserId,
} from "./identity.js";
import { CONTRACT_VERSION } from "./version.js";

export interface EventMetadata {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly contractVersion: typeof CONTRACT_VERSION;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly producer: string;
  readonly tenantId?: TenantId;
}

export interface DomainEvent<
  TType extends string,
  TPayload extends Readonly<Record<string, unknown>>,
> {
  readonly type: TType;
  readonly version: typeof CONTRACT_VERSION;
  readonly metadata: EventMetadata;
  readonly aggregate: {
    readonly type: string;
    readonly id: string;
  };
  readonly payload: TPayload;
}

export interface UserCreatedPayload {
  readonly userId: UserId;
  readonly email: string;
}

export interface MembershipCreatedPayload {
  readonly membershipId: MembershipId;
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly tenantId: TenantId;
  readonly roleIds: readonly RoleId[];
}

export interface RolePermissionGrantedPayload {
  readonly roleId: RoleId;
  readonly permissionId: PermissionId;
}

export type UserCreatedEvent = DomainEvent<"identity.user.created", UserCreatedPayload>;
export type MembershipCreatedEvent = DomainEvent<"identity.membership.created", MembershipCreatedPayload>;
export type RolePermissionGrantedEvent = DomainEvent<
  "authorization.role-permission.granted",
  RolePermissionGrantedPayload
>;

export type CoreEvent =
  | UserCreatedEvent
  | MembershipCreatedEvent
  | RolePermissionGrantedEvent;

export const EVENT_TYPES = {
  USER_CREATED: "identity.user.created",
  MEMBERSHIP_CREATED: "identity.membership.created",
  ROLE_PERMISSION_GRANTED: "authorization.role-permission.granted",
} as const;
