export const ROWS = [
  "LIVE_PROVIDER",
  "API_CREDIT",
  "SECRETS",
  "PROVEN",
  "PRODUCTION",
  "PR_MERGE"
];

const truth = value =>
  ["1", "true", "yes", "green", "confirmed", "ready"].includes(
    String(value ?? "").trim().toLowerCase()
  );
const text = value => typeof value === "string" && value.trim().length > 0;

/**
 * Environment variables are operator declarations, not verified evidence.
 * Until an independently trusted evidence verifier is connected, no declared
 * prerequisite may promote any readiness row to GREEN.
 */
export function evaluateReadiness(input = {}) {
  return {
    LIVE_PROVIDER: "RED",
    API_CREDIT: "RED",
    SECRETS: "RED",
    PROVEN: "RED",
    PRODUCTION: "RED",
    PR_MERGE: "RED",
    verificationState: "TRUSTED_EVIDENCE_VERIFIER_NOT_CONFIGURED",
    declaredInputs: {
      nonMockProviderConfigured: text(input.provider) && input.provider !== "<MOCK>",
      providerHealthDeclared: truth(input.providerHealth),
      apiCreditDeclared: truth(input.apiCredit) && text(input.creditEvidence),
      secretStoreDeclared: truth(input.secretStoreReady) && text(input.secretReference),
      runtimeValidationDeclared: truth(input.runtime),
      costUsageEvidenceDeclared: truth(input.costUsage),
      rollbackEvidenceDeclared: truth(input.rollback),
      finalGateDeclared: truth(input.finalGate),
      ciSuccessDeclared: truth(input.ci),
      closureDeclared: truth(input.closure),
      productionEvidenceDeclared: truth(input.productionEvidence)
    },
    blockers: [
      "TRUSTED_EVIDENCE_VERIFIER_NOT_CONFIGURED",
      "ENVIRONMENT_VARIABLES_ARE_NOT_EVIDENCE",
      "FINAL_GATE_PROMOTION_DISABLED"
    ]
  };
}

/**
 * This function is a guard, not a promotion API. It rejects any caller-supplied
 * GREEN state until a trusted verifier is actually implemented and wired in.
 */
export function assertFailClosed(state) {
  const invalid = ROWS.filter(row => state?.[row] !== "RED");
  if (invalid.length) {
    throw new Error(
      `readiness promotion denied without trusted evidence verifier: ${invalid.join(",")}`
    );
  }
  return true;
}

export function fromEnv(env = process.env) {
  return evaluateReadiness({
    provider: env.ASTRA_LIVE_PROVIDER,
    providerHealth: env.ASTRA_PROVIDER_HEALTH,
    apiCredit: env.ASTRA_API_CREDIT_CONFIRMED,
    creditEvidence: env.ASTRA_API_CREDIT_EVIDENCE_REF,
    secretStoreReady: env.ASTRA_SECRET_STORE_READY,
    secretReference: env.ASTRA_SECRET_REFERENCE,
    runtime: env.ASTRA_RUNTIME_VALIDATED,
    costUsage: env.ASTRA_COST_USAGE_EVIDENCE,
    rollback: env.ASTRA_ROLLBACK_EVIDENCE,
    finalGate: env.ASTRA_FINAL_GATE,
    productionEvidence: env.ASTRA_PRODUCTION_EVIDENCE,
    ci: env.ASTRA_CI_GREEN,
    closure: env.ASTRA_CLOSURE_GATE
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const state = fromEnv();
  assertFailClosed(state);
  console.log(JSON.stringify(state, null, 2));
}
