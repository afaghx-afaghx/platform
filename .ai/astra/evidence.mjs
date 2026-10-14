import { createHash } from "node:crypto";
import contract from "../../docs/ai/AFX-AI-ASTRA-001.contract.json" with { type: "json" };

const STATES = new Set(contract.evidence_states);
const FINAL = "PROVEN";

export function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function freezeDeep(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function immutableJsonSnapshot(value) {
  if (value === undefined) return null;
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error("evidence_payload_must_be_json_serializable");
  }
  if (serialized === undefined) throw new Error("evidence_payload_must_be_json_serializable");
  return freezeDeep(JSON.parse(serialized));
}

export function createEvidence(input = {}) {
  const status = input.status ?? "LOCAL_VALIDATED";
  if (!STATES.has(status)) throw new Error(`invalid evidence state: ${status}`);
  if (status === FINAL) {
    // A caller-supplied boolean is not proof of the constitutional Final Gate.
    // There is currently no trusted verifier/promoter wired into this module.
    throw new Error("PROVEN requires a trusted Final Gate verifier; direct promotion is denied");
  }
  if (status === "LOCAL_VALIDATED" && input.runtime_validated === true) {
    throw new Error("LOCAL_VALIDATED cannot claim runtime validation");
  }
  return Object.freeze({
    run_id: input.run_id ?? `local-${Date.now()}`,
    model: input.model ?? "NOT_RUN",
    capability: input.capability ?? "reasoning.primary",
    tool: input.tool ?? "local.mock.provider",
    authorization_decision: input.authorization_decision ?? "DENY",
    action: input.action ?? "NOT_EXECUTED",
    input_context_hash: input.input_context_hash ?? sha256(input.context ?? ""),
    result: immutableJsonSnapshot(input.result ?? null),
    test_results: immutableJsonSnapshot(input.test_results ?? null),
    artifact_refs: immutableJsonSnapshot(input.artifact_refs ?? []),
    timestamp: input.timestamp ?? new Date().toISOString(),
    status
  });
}
