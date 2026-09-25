import assert from "node:assert/strict";
import { test } from "node:test";
import type { AuthContextResponse, TenantId } from "@afaghx/contracts";
import { AfxClient, AfxApiError } from "../src/client.js";
import { AuthApi } from "../src/auth.js";
import { getTenantContext, requireTenantContext } from "../src/tenant.js";

test("client consumes the canonical auth context contract", async () => {
  let requestedUrl = "";
  const payload: AuthContextResponse = {
    authenticated: true,
    securityContext: {
      authenticated: true,
      userId: "user-1" as never,
      sessionId: "session-1" as never,
      decision: "allow",
      tenantContext: {
        tenantId: "tenant-1" as TenantId,
        membershipId: "membership-1" as never,
        userId: "user-1" as never,
        roleIds: [],
      },
    },
  };

  const fetcher: typeof fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ ok: true, data: payload, requestId: "req-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const auth = new AuthApi(new AfxClient({ baseUrl: "https://api.afaghx.com", fetch: fetcher }));
  const context = await auth.getContext();

  assert.equal(requestedUrl, "https://api.afaghx.com/v1/auth/context");
  assert.equal(context.securityContext.tenantContext?.tenantId, "tenant-1");
});

test("tenant helper fails closed when context is absent", () => {
  assert.equal(getTenantContext({ authenticated: false }), undefined);
  assert.throws(
    () => requireTenantContext({ authenticated: false }),
    /Tenant context is required/,
  );
});

test("API errors preserve the contract error code and request id", async () => {
  const fetcher: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        ok: false,
        error: { code: "AUTH_REQUIRED", message: "Authentication required", requestId: "req-2" },
      }),
      { status: 401, headers: { "content-type": "application/json" } },
    );

  const client = new AfxClient({ baseUrl: "https://api.afaghx.com", fetch: fetcher });
  await assert.rejects(
    () => client.request("/v1/auth/context"),
    (error: unknown) =>
      error instanceof AfxApiError &&
      error.code === "AUTH_REQUIRED" &&
      error.requestId === "req-2",
  );
});
