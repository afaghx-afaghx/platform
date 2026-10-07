import test from "node:test";
import assert from "node:assert/strict";
import { validateContract } from "./contract.mjs";
import { createModelRouter } from "./router.mjs";
import { createToolBoundary } from "./boundary.mjs";
import { authorizeCapability } from "./permission.mjs";

test("AFX-AI-ASTRA-001: contract is fail-closed", () => {
  assert.equal(validateContract(), true);
});

test("router resolves approved advanced reasoning provider", () => {
  const router = createModelRouter({ policy: { "reasoning.primary": "gpt-6-astra" } });
  assert.equal(router.resolve("reasoning.primary").model, "gpt-6-astra");
});

test("router rejects unsupported capabilities", () => {
  const router = createModelRouter({ providers: {} });
  assert.throws(() => router.resolve("database.admin"), /No approved model provider/);
});

test("boundary denies direct database mutation", () => {
  const boundary = createToolBoundary({ policy: { allowedTools: ["search.read"] } });
  assert.deepEqual(boundary.authorize("postgresql.direct_write").decision, "DENY");
});

test("boundary denies unregistered tools", () => {
  const boundary = createToolBoundary({ policy: { allowedTools: ["search.read"] } });
  assert.deepEqual(boundary.authorize("orders.execute").decision, "DENY");
});

test("boundary allows only registered tools", () => {
  const boundary = createToolBoundary({ policy: { allowedTools: ["search.read"] } });
  assert.deepEqual(boundary.authorize("search.read").decision, "ALLOW");
});

test("permission enforcement denies production mutation", () => {
  assert.equal(authorizeCapability("production_deploy").decision, "DENY");
  assert.equal(authorizeCapability("merge_pr").decision, "DENY");
  assert.equal(authorizeCapability("access_secrets").decision, "DENY");
  assert.equal(authorizeCapability("direct_database_mutation").decision, "DENY");
});

test("permission enforcement allows analysis", () => {
  assert.equal(authorizeCapability("analyze").decision, "ALLOW");
});
