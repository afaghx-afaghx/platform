export const MOCK_PROVIDER = "<MOCK>";

export function invokeAstra(input = {}) {
  if (input.provider !== "gpt-6-astra") {
    throw new Error("provider is not approved");
  }
  return {
    provider: "gpt-6-astra",
    mode: MOCK_PROVIDER,
    status: "LOCAL_VALIDATED",
    output: {
      action: input.action ?? "analyze",
      result: "Controlled Astra adapter executed in zero-cost local mode."
    }
  };
}
