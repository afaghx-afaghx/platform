import test from "node:test";
import assert from "node:assert/strict";
import { runControlledAstraRuntime } from "./runtime.mjs";

test("controlled runtime completes the full evidence chain only with explicit identity and tenant context", () => {
  const r = runControlledAstraRuntime({
    request: "inspect architecture",
    identity: { subject: "test-user", authenticated: true },
    tenant: { tenantId: "test-tenant", source: "SECURITY_CONTEXT" }
  });
  assert.equal(r.status, "LOCAL_VALIDATED");
  assert.deepEqual(r.chain, [
    "AUTH", "TENANT", "POLICY", "TOOL",
    "ASTRA_ROUTER", "PROVIDER", "EVIDENCE", "AUDIT"
  ]);
  assert.equal(r.provider_mode, "<MOCK>");
  assert.equal(r.evidence.status, "LOCAL_VALIDATED");
  assert.equal(r.audit.evidence_status, "LOCAL_VALIDATED");
});

test("runtime does not synthesize authentication when identity is omitted", () => {
  const r = runControlledAstraRuntime({ request: "inspect architecture" });
  assert.equal(r.status, "DENIED");
  assert.equal(r.reason, "AUTHENTICATION_REQUIRED");
  assert.equal(r.evidence.authorization_decision, "DENY");
});

test("runtime does not synthesize tenant context when tenant is omitted", () => {
  const r = runControlledAstraRuntime({
    request: "inspect architecture",
    identity: { subject: "test-user", authenticated: true }
  });
  assert.equal(r.status, "DENIED");
  assert.equal(r.reason, "SECURITY_CONTEXT_REQUIRED");
  assert.equal(r.evidence.authorization_decision, "DENY");
});

test("runtime fails closed when authentication is missing", () => {
  const r = runControlledAstraRuntime({
    identity: { subject: "mock-user", authenticated: false }
  });
  assert.equal(r.status, "DENIED");
  assert.equal(r.reason, "AUTHENTICATION_REQUIRED");
  assert.equal(r.evidence.authorization_decision, "DENY");
});

test("runtime fails closed when tenant context is not SecurityContext", () => {
  const r = runControlledAstraRuntime({
    tenant: { tenantId: "spoofed", source: "REQUEST_BODY" }
  });
  assert.equal(r.status, "DENIED");
  assert.equal(r.reason, "SECURITY_CONTEXT_REQUIRED");
});

test("runtime fails closed when tool is not policy-approved", () => {
  const r = runControlledAstraRuntime({
    policy: { allowedTools: [] }
  });
  assert.equal(r.status, "DENIED");
  assert.equal(r.reason, "TOOL_DENIED");
  assert.equal(r.audit.event, "AI_TOOL_DENIED");
});

test("runtime cannot upgrade evidence to PROVEN", () => {
  const r = runControlledAstraRuntime();
  assert.notEqual(r.evidence.status, "PROVEN");
});
