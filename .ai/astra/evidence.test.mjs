import test from "node:test";
import assert from "node:assert/strict";
import { createEvidence } from "./evidence.mjs";
import { invokeAstra } from "./provider.mjs";

test("evidence records LOCAL_VALIDATED and never upgrades it to PROVEN", () => {
  const e = createEvidence({ context: "hello", result: "ok" });
  assert.equal(e.status, "LOCAL_VALIDATED");
  assert.equal(e.model, "gpt-6-astra");
});

test("PROVEN cannot be self-asserted even when the caller sets runtime_validated", () => {
  assert.throws(() => createEvidence({ status: "PROVEN" }), /trusted Final Gate verifier/);
  assert.throws(
    () => createEvidence({
      status: "PROVEN",
      runtime_validated: true,
      final_gate: "PROVEN",
      artifact_refs: ["final-gate.json"]
    }),
    /trusted Final Gate verifier/
  );
});

test("Astra adapter is explicitly zero-cost MOCK", () => {
  const r = invokeAstra({ provider: "gpt-6-astra", action: "plan" });
  assert.equal(r.mode, "<MOCK>");
  assert.equal(r.status, "LOCAL_VALIDATED");
});

test("unapproved provider is rejected", () => {
  assert.throws(() => invokeAstra({ provider: "unknown" }), /not approved/);
});
