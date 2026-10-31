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

export interface AffiliateClickPayloadBase {
  readonly clickId: string;
  readonly campaignId: string;
  readonly affiliateId: string;
  readonly riskScore: number;
}

export interface AffiliateClickRecordedPayload extends AffiliateClickPayloadBase {
  readonly status: "raw" | "pending_review" | "rejected";
}

export interface AffiliateClickQualifiedPayload extends AffiliateClickPayloadBase {
  readonly status: "qualified";
  readonly ledgerTransactionId: string;
  readonly earningAmount: string;
  readonly currency: string;
}

export interface AffiliateClickRejectedPayload extends AffiliateClickPayloadBase {
  readonly status: "rejected";
  readonly rejectionCode: string;
}

export interface LedgerTransactionPostedPayload {
  readonly sourceType: string;
  readonly sourceId: string;
  readonly currency: string;
  readonly totalDebit: string;
  readonly totalCredit: string;
}

export interface LedgerTransactionReversedPayload {
  readonly reversalTransactionId: string;
  readonly originalTransactionId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly currency: string;
  readonly amount: string;
  readonly reason: string;
}

export type AffiliateClickRecordedEvent = DomainEvent<"affiliate.click.recorded", AffiliateClickRecordedPayload>;
export type AffiliateClickQualifiedEvent = DomainEvent<"affiliate.click.qualified", AffiliateClickQualifiedPayload>;
export type AffiliateClickRejectedEvent = DomainEvent<"affiliate.click.rejected", AffiliateClickRejectedPayload>;
export type LedgerTransactionPostedEvent = DomainEvent<"finance.ledger.transaction.posted", LedgerTransactionPostedPayload>;
export type LedgerTransactionReversedEvent = DomainEvent<"finance.ledger.transaction.reversed", LedgerTransactionReversedPayload>;

export type CoreEvent =
  | UserCreatedEvent
  | MembershipCreatedEvent
  | RolePermissionGrantedEvent;

export type BusinessEvent =
  | AffiliateClickRecordedEvent
  | AffiliateClickQualifiedEvent
  | AffiliateClickRejectedEvent
  | LedgerTransactionPostedEvent
  | LedgerTransactionReversedEvent;

export const EVENT_TYPES = {
  USER_CREATED: "identity.user.created",
  MEMBERSHIP_CREATED: "identity.membership.created",
  ROLE_PERMISSION_GRANTED: "authorization.role-permission.granted",
  AFFILIATE_CLICK_RECORDED: "affiliate.click.recorded",
  AFFILIATE_CLICK_QUALIFIED: "affiliate.click.qualified",
  AFFILIATE_CLICK_REJECTED: "affiliate.click.rejected",
  LEDGER_TRANSACTION_POSTED: "finance.ledger.transaction.posted",
  LEDGER_TRANSACTION_REVERSED: "finance.ledger.transaction.reversed",
} as const;
