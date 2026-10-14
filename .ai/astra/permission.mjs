const DEFAULT_PERMISSIONS = Object.freeze({
  read_approved_context: "ALLOW",
  analyze: "ALLOW",
  reason: "ALLOW",
  plan: "ALLOW",
  generate_code: "ALLOW",
  run_approved_tests: "ALLOW",
  inspect_approved_runtime: "ALLOW",
  create_evidence: "ALLOW",
  propose_repository_change: "ALLOW",
  create_pr: "CONDITIONAL",
  merge_pr: "DENY",
  production_deploy: "DENY",
  modify_core_policy: "DENY",
  access_secrets: "DENY",
  direct_database_mutation: "DENY",
  bypass_gateway_policy: "DENY",
  override_security_context: "DENY"
});

const HARD_DENY = new Set([
  "merge_pr",
  "production_deploy",
  "modify_core_policy",
  "access_secrets",
  "direct_database_mutation",
  "bypass_gateway_policy",
  "override_security_context"
]);

export function authorizeCapability(capability, permissions = DEFAULT_PERMISSIONS) {
  const ceiling = DEFAULT_PERMISSIONS[capability];
  // Unknown capabilities fail closed; caller-supplied policy can restrict the
  // contract but cannot elevate a constitutional DENY or add a new capability.
  if (ceiling === undefined || HARD_DENY.has(capability) || ceiling === "DENY") {
    return Object.freeze({ capability, decision: "DENY" });
  }

  const requested = permissions === DEFAULT_PERMISSIONS
    ? ceiling
    : permissions?.[capability];

  if (ceiling === "CONDITIONAL") {
    return Object.freeze({
      capability,
      decision: requested === "DENY" ? "DENY" : "CONDITIONAL"
    });
  }

  return Object.freeze({
    capability,
    decision: requested === "ALLOW" ? "ALLOW" : "DENY"
  });
}

export { DEFAULT_PERMISSIONS };
