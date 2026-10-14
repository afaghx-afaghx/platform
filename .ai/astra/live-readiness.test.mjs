import test from "node:test";
import assert from "node:assert/strict";
import { evaluateReadiness, assertFailClosed, ROWS } from "./live-readiness.mjs";

test("default state remains entirely RED", () => {
  const state = evaluateReadiness({ provider: "<MOCK>" });
  for (const row of ROWS) assert.equal(state[row], "RED");
  assert.equal(state.verificationState, "TRUSTED_EVIDENCE_VERIFIER_NOT_CONFIGURED");
  assertFailClosed(state);
});

test("declared API credit without a usable reference is recorded only as a declaration", () => {
  const state = evaluateReadiness({
    provider: "gpt-6-astra",
    providerHealth: true,
    apiCredit: true
  });
  assert.equal(state.API_CREDIT, "RED");
  assert.equal(state.declaredInputs.apiCreditDeclared, false);
});

test("declared secret readiness without a reference cannot green a gate", () => {
  const state = evaluateReadiness({
    provider: "gpt-6-astra",
    providerHealth: true,
    secretStoreReady: true
  });
  assert.equal(state.SECRETS, "RED");
  assert.equal(state.declaredInputs.secretStoreDeclared, false);
});

test("mock provider never becomes live or proven", () => {
  const state = evaluateReadiness({
    provider: "<MOCK>",
    providerHealth: true,
    apiCredit: true,
    creditEvidence: "evidence/credit",
    secretStoreReady: true,
    secretReference: "secret-store://astra",
    runtime: true,
    costUsage: true,
    rollback: true,
    finalGate: true,
    ci: true,
    closure: true
  });
  assert.equal(state.LIVE_PROVIDER, "RED");
  assert.equal(state.PROVEN, "RED");
  assert.equal(state.declaredInputs.runtimeValidationDeclared, true);
});

test("complete environment declarations still cannot promote any readiness row", () => {
  const state = evaluateReadiness({
    provider: "gpt-6-astra",
    providerHealth: true,
    apiCredit: true,
    creditEvidence: "evidence/credit",
    secretStoreReady: true,
    secretReference: "secret-store://astra",
    runtime: true,
    costUsage: true,
    rollback: true,
    finalGate: true,
    ci: true,
    closure: true,
    productionEvidence: true
  });
  for (const row of ROWS) assert.equal(state[row], "RED");
  assert.equal(state.verificationState, "TRUSTED_EVIDENCE_VERIFIER_NOT_CONFIGURED");
  assertFailClosed(state);
});

test("caller-supplied GREEN statuses are rejected by the fail-closed guard", () => {
  assert.throws(
    () => assertFailClosed({
      LIVE_PROVIDER: "GREEN",
      API_CREDIT: "GREEN",
      SECRETS: "GREEN",
      PROVEN: "GREEN",
      PRODUCTION: "RED",
      PR_MERGE: "GREEN"
    }),
    /trusted evidence verifier/
  );
});

test("incomplete state objects are not accepted as readiness decisions", () => {
  assert.throws(() => assertFailClosed({ PROVEN: "RED" }), /LIVE_PROVIDER|API_CREDIT|SECRETS/);
});
