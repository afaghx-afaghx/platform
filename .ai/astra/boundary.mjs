const DENIED_TOOLS = new Set([
  "postgresql.direct_write",
  "secrets.read",
  "credentials.read",
  "private_keys.read",
  "gateway.bypass",
  "security_context.override",
  "production.deploy"
]);

export function createToolBoundary({ policy }) {
  if (!policy) throw new Error("Policy is required");
  return Object.freeze({
    authorize(tool) {
      if (DENIED_TOOLS.has(tool)) return { decision: "DENY", reason: "EXPLICIT_DENY" };
      if (!policy.allowedTools?.includes(tool)) return { decision: "DENY", reason: "NOT_REGISTERED" };
      return { decision: "ALLOW", reason: "REGISTERED_AND_POLICY_APPROVED" };
    },
    execute(tool, action) {
      const decision = this.authorize(tool);
      if (decision.decision !== "ALLOW") throw new Error(`Tool denied: ${tool}`);
      const result = action();
      return { result, evidence: { tool, authorization_decision: decision.decision, action: "EXECUTE" } };
    }
  });
}
