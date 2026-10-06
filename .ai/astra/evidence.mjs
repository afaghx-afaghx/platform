import { createHash } from "node:crypto";
import contract from "../../docs/ai/AFX-AI-ASTRA-001.contract.json" with { type: "json" };

const STATES = new Set(contract.evidence_states);
const FINAL = "PROVEN";

export function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function createEvidence(input = {}) {
  const status = input.status ?? "LOCAL_VALIDATED";
  if (!STATES.has(status)) throw new Error(`invalid evidence state: ${status}`);
  if (status === FINAL && input.runtime_validated !== true) {
    throw new Error("PROVEN requires runtime validation");
  }
  if (status === "LOCAL_VALIDATED" && input.runtime_validated === true) {
    throw new Error("LOCAL_VALIDATED cannot claim runtime validation");
  }
  return Object.freeze({
    run_id: input.run_id ?? `local-${Date.now()}`,
    model: input.model ?? "gpt-6-astra",
    capability: input.capability ?? "reasoning.primary",
    tool: input.tool ?? "local.mock.provider",
    authorization_decision: input.authorization_decision ?? "ALLOW",
    action: input.action ?? "analyze",
    input_context_hash: input.input_context_hash ?? sha256(input.context ?? ""),
    result: input.result ?? null,
    test_results: input.test_results ?? null,
    artifact_refs: input.artifact_refs ?? [],
    timestamp: input.timestamp ?? new Date().toISOString(),
    status
  });
}
