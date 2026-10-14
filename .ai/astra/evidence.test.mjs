import test from "node:test";
import assert from "node:assert/strict";
import { createEvidence } from "./evidence.mjs";
import { invokeAstra } from "./provider.mjs";

test("evidence records LOCAL_VALIDATED and never upgrades it to PROVEN", () => {
  const e = createEvidence({ context: "hello", result: "ok" });
  assert.equal(e.status, "LOCAL_VALIDATED");
  assert.equal(e.model, "NOT_RUN");
  assert.equal(e.authorization_decision, "DENY");
  assert.equal(e.action, "NOT_EXECUTED");
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

test("evidence snapshots and freezes nested inputs so later mutation cannot rewrite the record", () => {
  const refs = ["artifact://original"];
  const result = { summary: "original", nested: { verified: false } };
  const evidence = createEvidence({ artifact_refs: refs, result });

  refs.push("artifact://injected");
  result.summary = "mutated";
  result.nested.verified = true;

  assert.deepEqual(evidence.artifact_refs, ["artifact://original"]);
  assert.equal(evidence.result.summary, "original");
  assert.equal(evidence.result.nested.verified, false);
  assert.throws(() => evidence.artifact_refs.push("artifact://late"), TypeError);
  assert.throws(() => { evidence.result.nested.verified = true; }, TypeError);
});

test("non-JSON evidence payloads are rejected", () => {
  const circular = {};
  circular.self = circular;
  assert.throws(
    () => createEvidence({ result: circular }),
    /evidence_payload_must_be_json_serializable/
  );
});

test("CI_VALIDATED cannot be self-asserted without a trusted CI verifier", () => {
  assert.throws(
    () => createEvidence({ status: "CI_VALIDATED", ci: true, artifact_refs: ["ci-run-1"] }),
    /trusted CI evidence verifier/
  );
});

test("RUNTIME_VALIDATED cannot be self-asserted by a caller", () => {
  assert.throws(
    () => createEvidence({ status: "RUNTIME_VALIDATED", runtime_validated: true }),
    /trusted runtime evidence verifier/
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
