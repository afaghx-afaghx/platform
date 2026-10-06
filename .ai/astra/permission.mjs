const DEFAULT_PERMISSIONS = Object.freeze({
  read_approved_context:"ALLOW",
  analyze:"ALLOW",
  reason:"ALLOW",
  plan:"ALLOW",
  generate_code:"ALLOW",
  run_approved_tests:"ALLOW",
  inspect_approved_runtime:"ALLOW",
  create_evidence:"ALLOW",
  propose_repository_change:"ALLOW",
  create_pr:"CONDITIONAL",
  merge_pr:"DENY",
  production_deploy:"DENY",
  modify_core_policy:"DENY",
  access_secrets:"DENY",
  direct_database_mutation:"DENY",
  bypass_gateway_policy:"DENY",
  override_security_context:"DENY"
});

export function authorizeCapability(capability, permissions = DEFAULT_PERMISSIONS) {
  const decision = permissions[capability] ?? "DENY";
  return Object.freeze({ capability, decision });
}

export { DEFAULT_PERMISSIONS };
