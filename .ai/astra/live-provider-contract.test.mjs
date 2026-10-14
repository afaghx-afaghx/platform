import test from "node:test";
import assert from "node:assert/strict";
import { validateLiveProviderContract } from "./live-provider-contract.mjs";
import { createExecutionIdentity, assertSameExecution } from "./idempotency.mjs";
import { createCostUsageEvidence } from "./cost-usage.mjs";
import { createLiveAdapter } from "./live-adapter.mjs";

test("live contract requires controlled prerequisites", () => {
  assert.equal(validateLiveProviderContract(), true);
});

test("execution identity is mandatory and stable", () => {
  const first = createExecutionIdentity({ requestId: "r1", idempotencyKey: "k1" });
  assert.doesNotThrow(() => assertSameExecution(first, { requestId: "r1", idempotencyKey: "k1" }));
  assert.throws(() => assertSameExecution(first, { requestId: "r2", idempotencyKey: "k1" }));
});

test("cost evidence requires usage metrics", () => {
  const evidence = createCostUsageEvidence({
    requestId: "r1",
    provider: "gpt-6-astra",
    model: "gpt-6-astra",
    inputTokens: 10,
    outputTokens: 20,
    costMicrounits: 30
  });
  assert.equal(evidence.costMicrounits, 30);
});

test("injected provider callback is not reported as verified live or production evidence", async () => {
  let observed;
  const adapter = createLiveAdapter({
    healthCheck: async () => true,
    secretStore: {
      resolveReference: async reference => ({ reference, available: true })
    },
    providerCall: async request => {
      observed = request;
      return { ok: true, output: "mocked response" };
    }
  });

  const result = await adapter.execute({
    requestId: "r1",
    idempotencyKey: "k1",
    secretReference: "secret-store://mock",
    payload: { prompt: "test" }
  });

  assert.equal(result.executionState, "CALL_COMPLETED_UNVERIFIED");
  assert.equal(result.evidenceStatus, "NOT_PROVEN");
  assert.equal(result.proven, false);
  assert.equal(result.productionReady, false);
  assert.equal(observed.secretReference, "secret-store://mock");
  assert.equal("secretValue" in observed, false);
});

test("live adapter fails closed when the secret-store reference is not verified", async () => {
  const adapter = createLiveAdapter({
    healthCheck: async () => true,
    secretStore: {
      resolveReference: async reference => ({ reference, available: false })
    },
    providerCall: async () => {
      throw new Error("must_not_call_provider");
    }
  });

  await assert.rejects(
    adapter.execute({
      requestId: "r1",
      idempotencyKey: "k1",
      secretReference: "secret-store://missing",
      payload: {}
    }),
    /secret_reference_not_verified/
  );
});
