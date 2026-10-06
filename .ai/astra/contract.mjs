import contract from "../../docs/ai/AFX-AI-ASTRA-001.contract.json" with { type: "json" };

export function validateContract(input = contract) {
  const required = ["id","version","sequence","permissions","evidence_states","fail_mode","promotion_requires","final_gate_state"];
  for (const key of required) if (!(key in input)) throw new Error(`Missing contract field: ${key}`);
  if (input.id !== "AFX-AI-ASTRA-001") throw new Error("Invalid contract id");
  if (input.fail_mode !== "FAIL_CLOSED") throw new Error("Astra contract must fail closed");
  if (input.final_gate_state !== "PROVEN") throw new Error("Final gate must be PROVEN");
  if (input.permissions.access_secrets !== "DENY") throw new Error("Secrets access must be denied");
  if (input.permissions.direct_database_mutation !== "DENY") throw new Error("Direct DB mutation must be denied");
  if (input.permissions.override_security_context !== "DENY") throw new Error("SecurityContext override must be denied");
  if (input.permissions.bypass_gateway_policy !== "DENY") throw new Error("Gateway bypass must be denied");
  return true;
}

validateContract();
