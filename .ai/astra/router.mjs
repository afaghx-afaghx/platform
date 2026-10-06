import { validateContract } from "./contract.mjs";

const PROVIDERS = Object.freeze({
  "gpt-6-astra": Object.freeze({
    model: "gpt-6-astra",
    capabilities: new Set(["reasoning.primary","coding.primary","vision.primary","agent.planning"])
  }),
  "gpt-5.6": Object.freeze({
    model: "gpt-5.6",
    capabilities: new Set(["reasoning.primary","coding.primary"])
  })
});

export function createModelRouter({ policy = {}, providers = PROVIDERS } = {}) {
  validateContract();
  return Object.freeze({
    resolve(capability) {
      const preferred = policy[capability];
      if (preferred && providers[preferred]?.capabilities.has(capability)) return providers[preferred];
      for (const provider of Object.values(providers)) {
        if (provider.capabilities.has(capability)) return provider;
      }
      throw new Error(`No approved model provider for capability: ${capability}`);
    }
  });
}
