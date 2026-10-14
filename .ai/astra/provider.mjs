export const MOCK_PROVIDER = "<MOCK>";

export function invokeAstra(input = {}) {
  if (input.provider !== "gpt-6-astra") {
    throw new Error("provider is not approved");
  }
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt) throw new Error("prompt_required");
  return {
    provider: "gpt-6-astra",
    mode: MOCK_PROVIDER,
    status: "LOCAL_VALIDATED",
    output: {
      action: input.action ?? "analyze",
      result: "MOCK_ONLY: the request was accepted, but no real model inference was performed.",
      inputAccepted: true
    }
  };
}
