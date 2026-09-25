import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTRACT_MEDIA_TYPE,
  CONTRACT_VERSION,
  EVENT_TYPES,
  type ApiResponse,
  type MembershipCreatedEvent,
  type UserId,
} from "../src/index.js";

test("contract package exposes an explicit v1 version", () => {
  assert.equal(CONTRACT_VERSION, "v1");
  assert.equal(
    CONTRACT_MEDIA_TYPE,
    "application/vnd.afaghx.contract.v1+json",
  );
});

test("event types are explicit and stable", () => {
  assert.equal(EVENT_TYPES.USER_CREATED, "identity.user.created");
  assert.equal(EVENT_TYPES.MEMBERSHIP_CREATED, "identity.membership.created");
  assert.equal(
    EVENT_TYPES.ROLE_PERMISSION_GRANTED,
    "authorization.role-permission.granted",
  );
});

test("API response discriminates success from failure", () => {
  const success: ApiResponse<{ id: UserId }> = {
    ok: true,
    data: { id: "usr_001" as UserId },
    requestId: "req_001",
  };

  assert.equal(success.ok, true);
  assert.equal(success.data.id, "usr_001");
});

test("membership event carries tenant context and contract version", () => {
  const event: MembershipCreatedEvent = {
    type: EVENT_TYPES.MEMBERSHIP_CREATED,
    version: CONTRACT_VERSION,
    metadata: {
      eventId: "evt_001",
      occurredAt: "2026-01-01T00:00:00.000Z",
      contractVersion: CONTRACT_VERSION,
      correlationId: "cor_001",
      producer: "AFX-CORE",
      tenantId: "ten_001" as MembershipCreatedEvent["metadata"]["tenantId"],
    },
    aggregate: {
      type: "membership",
      id: "mem_001",
    },
    payload: {
      membershipId: "mem_001" as MembershipCreatedEvent["payload"]["membershipId"],
      userId: "usr_001" as MembershipCreatedEvent["payload"]["userId"],
      organizationId:
        "org_001" as MembershipCreatedEvent["payload"]["organizationId"],
      tenantId: "ten_001" as MembershipCreatedEvent["payload"]["tenantId"],
      roleIds: ["role_admin" as MembershipCreatedEvent["payload"]["roleIds"][number]],
    },
  };

  assert.equal(event.version, "v1");
  assert.equal(event.payload.tenantId, "ten_001");
});
