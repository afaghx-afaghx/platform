import { createExecutionIdentity } from "./idempotency.mjs";

export function createLiveAdapter({ providerCall, healthCheck, secretStore } = {}) {
  return Object.freeze({
    async execute(input = {}) {
      if (typeof providerCall !== "function" ||
          typeof healthCheck !== "function" ||
          typeof secretStore?.resolveReference !== "function") {
        throw new Error("live_adapter_not_ready");
      }

      const identity = createExecutionIdentity(input);
      const health = await healthCheck();
      if (health !== true) throw new Error("provider_unhealthy");

      const secret = await secretStore.resolveReference(input.secretReference);
      if (!secret || secret.available !== true ||
          secret.reference !== input.secretReference) {
        throw new Error("secret_reference_not_verified");
      }

      const result = await providerCall({
        identity,
        secretReference: secret.reference,
        input: input.payload
      });

      // A successful callback invocation alone does not prove provider identity,
      // billing, rollback readiness, evidence provenance or the Final Gate.
      return Object.freeze({
        identity,
        result,
        configuredProvider: "gpt-6-astra",
        executionState: "CALL_COMPLETED_UNVERIFIED",
        evidenceStatus: "NOT_PROVEN",
        proven: false,
        productionReady: false
      });
    }
  });
}
