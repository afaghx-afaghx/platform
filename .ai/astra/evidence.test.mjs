import test from "node:test";
import assert from "node:assert/strict";
import { createEvidence } from "./evidence.mjs";
import { invokeAstra } from "./provider.mjs";

test("evidence records LOCAL_VALIDATED and never upgrades it to PROVEN", () => {
  const e = createEvidence({ context: "hello", result: "ok" });
  assert.equal(e.status, "LOCAL_VALIDATED");
  assert.equal(e.model, "gpt-6-astra");
});

test("PROVEN is rejected without runtime validation", () => {
  assert.throws(() => createEvidence({ status: "PROVEN" }), /runtime validation/);
});

test("Astra adapter is explicitly zero-cost MOCK", () => {
  const r = invokeAstra({ provider: "gpt-6-astra", action: "plan" });
  assert.equal(r.mode, "<MOCK>");
  assert.equal(r.status, "LOCAL_VALIDATED");
});

test("unapproved provider is rejected", () => {
  assert.throws(() => invokeAstra({ provider: "unknown" }), /not approved/);
});
