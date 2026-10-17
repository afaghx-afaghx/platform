import { createHash, verify as verifySignature } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const DEFAULT_POLICY = '.ai/controls/four-protocol-quality-gate.json';
const SHA_RE = /^[a-f0-9]{40}$/i;
const HASH_RE = /^[a-f0-9]{64}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const REQUIRED_PROTOCOL_IDS = ['P1', 'P2', 'P3', 'P4'];

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isTimestamp(value) {
  return typeof value === 'string' && ISO_RE.test(value) && Number.isFinite(Date.parse(value));
}

function withoutEnvelopeSeal(envelope) {
  const { integrity, signature, ...core } = envelope;
  return core;
}

function signingPayload(core, integrity) {
  return Buffer.from(canonicalJson({ core, integrity }), 'utf8');
}

export function validatePolicy(policy) {
  const errors = [];
  if (policy?.schema_version !== 'AFX-4PCG-1.0.0') errors.push('POLICY_SCHEMA_VERSION_INVALID');
  if (typeof policy?.repository !== 'string' || !policy.repository) errors.push('POLICY_REPOSITORY_MISSING');
  if (policy?.release_floor !== 9.5 || policy?.protocol_floor !== 9.5) errors.push('QUALITY_FLOOR_MUST_BE_9_5');
  if (policy?.score_scale !== 10) errors.push('SCORE_SCALE_MUST_BE_10');
  if (policy?.trust_policy?.signature_algorithm !== 'Ed25519') errors.push('SIGNATURE_ALGORITHM_MUST_BE_ED25519');
  if (typeof policy?.trust_policy?.trusted_verifiers_source !== 'string' || !policy.trust_policy.trusted_verifiers_source.trim()) errors.push('TRUST_REGISTRY_SOURCE_MISSING');
  if (!Array.isArray(policy?.protocols) || policy.protocols.length !== 4) errors.push('EXACTLY_FOUR_PROTOCOLS_REQUIRED');
  const protocolIds = new Set();
  const controlIds = new Set();
  let weightTotal = 0;
  for (const protocol of policy?.protocols ?? []) {
    if (!REQUIRED_PROTOCOL_IDS.includes(protocol.id) || protocolIds.has(protocol.id)) errors.push(`PROTOCOL_ID_INVALID_OR_DUPLICATE:${protocol.id}`);
    protocolIds.add(protocol.id);
    if (!Number.isFinite(protocol.weight) || protocol.weight <= 0) errors.push(`PROTOCOL_WEIGHT_INVALID:${protocol.id}`);
    else weightTotal += protocol.weight;
    if (!Array.isArray(protocol.controls) || protocol.controls.length !== 10) errors.push(`PROTOCOL_MUST_HAVE_10_CONTROLS:${protocol.id}`);
    for (const control of protocol.controls ?? []) {
      if (!control.id || controlIds.has(control.id)) errors.push(`CONTROL_ID_MISSING_OR_DUPLICATE:${control.id}`);
      controlIds.add(control.id);
      if (typeof control.critical !== 'boolean') errors.push(`CONTROL_CRITICAL_FLAG_MISSING:${control.id}`);
      if (!Number.isFinite(control.max_age_hours) || control.max_age_hours <= 0) errors.push(`CONTROL_FRESHNESS_INVALID:${control.id}`);
      if (!Array.isArray(control.allowed_evidence_kinds) || control.allowed_evidence_kinds.length === 0) errors.push(`CONTROL_EVIDENCE_KINDS_MISSING:${control.id}`);
      if (!Array.isArray(control.allowed_verifier_roles) || control.allowed_verifier_roles.length === 0) errors.push(`CONTROL_VERIFIER_ROLES_MISSING:${control.id}`);
    }
  }
  if (REQUIRED_PROTOCOL_IDS.some(id => !protocolIds.has(id))) errors.push('PROTOCOL_SET_INCOMPLETE');
  if (Math.abs(weightTotal - 1) > 1e-9) errors.push('PROTOCOL_WEIGHTS_MUST_SUM_TO_1');
  if (policy?.time_policy?.expires_at_required !== true) errors.push('EVIDENCE_EXPIRY_MUST_BE_REQUIRED');
  return { valid: errors.length === 0, errors, protocol_count: protocolIds.size, control_count: controlIds.size };
}

function failClosed(reason, details = {}) {
  return { state: 'RED', release_eligible: false, score: null, protocols: [], blockers: [reason], ...details };
}

export function evaluateEvidence({ policy, envelope, expectedSha, trustedVerifiers, now = new Date() }) {
  const policyResult = validatePolicy(policy);
  if (!policyResult.valid) return failClosed('POLICY_INVALID', { policy_errors: policyResult.errors });
  if (!envelope || typeof envelope !== 'object') return failClosed('EVIDENCE_ENVELOPE_MISSING');
  if (!SHA_RE.test(expectedSha ?? '')) return failClosed('EXPECTED_CANDIDATE_SHA_INVALID');
  if (envelope.schema_version !== 'AFX-EVIDENCE-ENVELOPE-1.0.0') return failClosed('EVIDENCE_SCHEMA_VERSION_INVALID');
  if (!Array.isArray(trustedVerifiers) || trustedVerifiers.length === 0) return failClosed('TRUSTED_VERIFIER_REGISTRY_EMPTY');
  if (envelope.subject?.repository !== policy.repository) return failClosed('REPOSITORY_MISMATCH');
  if (envelope.subject?.commit_sha !== expectedSha) return failClosed('CANDIDATE_SHA_MISMATCH');
  if (envelope.subject?.deployed_sha !== expectedSha) return failClosed('DEPLOYED_SHA_MISMATCH');
  if (envelope.subject?.environment !== 'production') return failClosed('ENVIRONMENT_NOT_PRODUCTION');
  if (typeof envelope.subject?.implementation_actor_id !== 'string' || !envelope.subject.implementation_actor_id.trim()) return failClosed('IMPLEMENTATION_ACTOR_ID_MISSING');
  if (!envelope.run_id || !isTimestamp(envelope.created_at) || !isTimestamp(envelope.expires_at)) return failClosed('ENVELOPE_METADATA_INVALID');

  const nowMs = now.getTime();
  const createdMs = Date.parse(envelope.created_at);
  const expiresMs = Date.parse(envelope.expires_at);
  const skewMs = policy.time_policy.maximum_clock_skew_minutes * 60_000;
  if (createdMs > nowMs + skewMs) return failClosed('ENVELOPE_CREATED_IN_FUTURE');
  if (nowMs - createdMs > policy.time_policy.envelope_max_age_hours * 3_600_000) return failClosed('ENVELOPE_STALE');
  if (expiresMs <= nowMs) return failClosed('ENVELOPE_EXPIRED');
  if (expiresMs <= createdMs) return failClosed('ENVELOPE_EXPIRY_INVALID');
  if (expiresMs - createdMs > policy.time_policy.envelope_max_age_hours * 3_600_000) return failClosed('ENVELOPE_VALIDITY_WINDOW_TOO_LONG');

  const signer = trustedVerifiers.find(item => item.id === envelope.signature?.key_id && item.can_sign_envelope === true && item.role === policy.trust_policy.envelope_signer_role && typeof item.public_key_pem === 'string');
  if (!signer) return failClosed('ENVELOPE_SIGNER_UNTRUSTED');
  if (signer.independent !== true || typeof signer.actor_id !== 'string' || !signer.actor_id.trim() || signer.actor_id === envelope.subject.implementation_actor_id) return failClosed('ENVELOPE_SIGNER_NOT_INDEPENDENT');
  if (envelope.signature?.algorithm !== 'Ed25519' || typeof envelope.signature?.value !== 'string') return failClosed('ENVELOPE_SIGNATURE_MISSING_OR_INVALID');

  const core = withoutEnvelopeSeal(envelope);
  const calculatedIntegrity = sha256(canonicalJson(core));
  if (envelope.integrity?.sha256 !== calculatedIntegrity || !HASH_RE.test(envelope.integrity?.sha256 ?? '')) return failClosed('ENVELOPE_INTEGRITY_MISMATCH');
  let signatureValid = false;
  try {
    signatureValid = verifySignature(null, signingPayload(core, envelope.integrity), signer.public_key_pem, Buffer.from(envelope.signature.value, 'base64'));
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) return failClosed('ENVELOPE_SIGNATURE_VERIFICATION_FAILED');

  if (!Array.isArray(envelope.results)) return failClosed('CONTROL_RESULTS_MISSING');
  const controls = policy.protocols.flatMap(protocol => protocol.controls.map(control => ({ ...control, protocol_id: protocol.id, protocol_weight: protocol.weight })));
  const resultById = new Map();
  const duplicateIds = [];
  for (const result of envelope.results) {
    if (resultById.has(result?.control_id)) duplicateIds.push(result.control_id);
    else resultById.set(result.control_id, result);
  }
  if (duplicateIds.length) return failClosed('DUPLICATE_CONTROL_RESULTS', { duplicate_control_ids: duplicateIds });
  const unknownIds = [...resultById.keys()].filter(id => !controls.some(control => control.id === id));
  if (unknownIds.length) return failClosed('UNKNOWN_CONTROL_IDS', { unknown_control_ids: unknownIds });

  const blockers = [];
  const evaluated = [];
  const signerId = envelope.signature.key_id;
  const clockSkew = policy.time_policy.maximum_clock_skew_minutes * 60_000;
  for (const control of controls) {
    const result = resultById.get(control.id);
    const issues = [];
    let points = 0;
    if (!result) {
      issues.push('CONTROL_RESULT_MISSING');
    } else {
      if (!policy.status_values.includes(result.status)) issues.push('CONTROL_STATUS_INVALID');
      if (!isTimestamp(result.observed_at)) issues.push('OBSERVED_AT_INVALID');
      else {
        const observedMs = Date.parse(result.observed_at);
        if (observedMs > nowMs + clockSkew) issues.push('OBSERVATION_FROM_FUTURE');
        if (observedMs > createdMs + clockSkew) issues.push('OBSERVATION_AFTER_ENVELOPE_CREATION');
        if (nowMs - observedMs > control.max_age_hours * 3_600_000) issues.push('CONTROL_EVIDENCE_STALE');
        if (observedMs < createdMs - control.max_age_hours * 3_600_000) issues.push('OBSERVATION_OUTSIDE_VALIDITY_WINDOW');
      }
      if (typeof result.source_sha !== 'string' || result.source_sha.toLowerCase() !== expectedSha.toLowerCase()) issues.push('CONTROL_SOURCE_SHA_MISMATCH');
      const verifier = trustedVerifiers.find(item => item.id === result.verified_by && item.can_sign_envelope !== true);
      if (!verifier) issues.push('CONTROL_VERIFIER_UNTRUSTED');
      else {
        if (!control.allowed_verifier_roles.includes(verifier.role)) issues.push('CONTROL_VERIFIER_ROLE_NOT_ALLOWED');
        if (typeof verifier.actor_id !== 'string' || !verifier.actor_id.trim() || verifier.actor_id === envelope.subject.implementation_actor_id) issues.push('CONTROL_VERIFIER_NOT_INDEPENDENT_FROM_IMPLEMENTER');
        if (control.requires_independent_verifier && verifier.independent !== true) issues.push('INDEPENDENT_VERIFIER_REQUIRED');
        if (result.verified_by === signerId) issues.push('ENVELOPE_SIGNER_CANNOT_SELF_VERIFY_CONTROL');
      }
      const evidence = result.evidence;
      if (!evidence || typeof evidence !== 'object') issues.push('EVIDENCE_PROVENANCE_MISSING');
      else {
        if (!control.allowed_evidence_kinds.includes(evidence.kind)) issues.push('EVIDENCE_KIND_NOT_ALLOWED');
        if (typeof evidence.uri !== 'string' || !evidence.uri.startsWith('https://')) issues.push('EVIDENCE_URI_INVALID');
        if (!HASH_RE.test(evidence.sha256 ?? '')) issues.push('ARTIFACT_DIGEST_INVALID');
        if (evidence.digest_verified !== true) issues.push('ARTIFACT_DIGEST_NOT_VERIFIED');
        if (typeof evidence.source_system !== 'string' || !evidence.source_system.trim()) issues.push('EVIDENCE_SOURCE_SYSTEM_MISSING');
        if (typeof evidence.reference_id !== 'string' || !evidence.reference_id.trim()) issues.push('EVIDENCE_REFERENCE_ID_MISSING');
        if (evidence.source_sha?.toLowerCase() !== expectedSha.toLowerCase()) issues.push('EVIDENCE_SOURCE_SHA_MISMATCH');
        if (evidence.mocked !== false) issues.push('MOCKED_OR_UNDECLARED_EVIDENCE');
        if (!isTimestamp(evidence.captured_at)) issues.push('EVIDENCE_CAPTURE_TIME_INVALID');
        if (typeof evidence.verification_method !== 'string' || !evidence.verification_method.trim()) issues.push('VERIFICATION_METHOD_MISSING');
        if (result.status === 'PASS' && (!Number.isInteger(evidence.exit_code) || evidence.exit_code !== 0)) issues.push('PASS_REQUIRES_ZERO_EXIT_CODE');
        if (isTimestamp(evidence.captured_at) && Date.parse(evidence.captured_at) > createdMs + clockSkew) issues.push('ARTIFACT_CAPTURE_AFTER_ENVELOPE_CREATION');
        if (isTimestamp(evidence.captured_at) && Date.parse(evidence.captured_at) > nowMs + clockSkew) issues.push('EVIDENCE_CAPTURED_IN_FUTURE');
        if (isTimestamp(evidence.captured_at) && nowMs - Date.parse(evidence.captured_at) > control.max_age_hours * 3_600_000) issues.push('ARTIFACT_STALE');
      }
      if (result.status === 'PASS') points = 1;
      else if (result.status === 'PARTIAL' && !control.critical) points = 0.5;
      else points = 0;
      if (control.critical && result.status !== 'PASS') issues.push('CRITICAL_CONTROL_NOT_PASS');
      if (result.status === 'FAIL' || result.status === 'UNKNOWN') issues.push(`CONTROL_STATUS_${result.status}`);
      if (result.status === 'PARTIAL' && control.critical) issues.push('PARTIAL_NOT_ALLOWED_FOR_CRITICAL_CONTROL');
    }
    if (issues.length) {
      points = 0;
      blockers.push(...issues.map(issue => `${control.id}:${issue}`));
    }
    evaluated.push({ control_id: control.id, protocol_id: control.protocol_id, critical: control.critical, status: result?.status ?? 'UNKNOWN', points, max_points: 1, issues });
  }

  const protocols = policy.protocols.map(protocol => {
    const rows = evaluated.filter(item => item.protocol_id === protocol.id);
    const score = Math.round((rows.reduce((sum, row) => sum + row.points, 0) / rows.length) * 100) / 10;
    const criticalFailed = rows.some(row => row.critical && row.status !== 'PASS');
    return { id: protocol.id, name: protocol.name, weight: protocol.weight, score, critical_failed: criticalFailed, state: score >= policy.protocol_floor && !criticalFailed && rows.every(row => row.issues.length === 0) ? 'GREEN' : 'RED', controls: rows };
  });
  const weighted = protocols.reduce((sum, protocol) => sum + protocol.score * protocol.weight, 0);
  const overallScore = Math.round(weighted * 100) / 100;
  const overallScorePasses = weighted + 1e-9 >= policy.release_floor;
  const protocolUnderFloor = protocols.filter(protocol => protocol.score < policy.protocol_floor).map(protocol => protocol.id);
  if (protocolUnderFloor.length) blockers.push(`PROTOCOL_SCORE_BELOW_FLOOR:${protocolUnderFloor.join(',')}`);
  if (!overallScorePasses) blockers.push('OVERALL_SCORE_BELOW_RELEASE_FLOOR');
  const noControlIssues = evaluated.every(control => control.issues.length === 0);
  const state = blockers.length === 0 && noControlIssues && protocols.every(protocol => protocol.state === 'GREEN') && overallScorePasses ? 'PROVEN' : 'RED';
  return { state, release_eligible: state === 'PROVEN', score: overallScore, score_floor: policy.release_floor, protocol_floor: policy.protocol_floor, protocols, blockers: [...new Set(blockers)], envelope_sha256: envelope.integrity.sha256, candidate_sha: expectedSha };
}

async function main(args) {
  const policyPath = args.find((_, i) => args[i - 1] === '--policy') ?? DEFAULT_POLICY;
  const evidencePath = args.find((_, i) => args[i - 1] === '--evidence');
  const expectedSha = args.find((_, i) => args[i - 1] === '--sha');
  const policy = JSON.parse(await readFile(policyPath, 'utf8'));
  if (args.includes('--validate-policy')) {
    const result = validatePolicy(policy);
    process.stdout.write(`${JSON.stringify({ policy_valid: result.valid, protocol_count: result.protocol_count, control_count: result.control_count, release_floor: policy.release_floor, protocol_floor: policy.protocol_floor, note: 'Policy validation is not a release approval. Live evidence evaluation remains RED until a trusted registry and signed evidence envelope are supplied.' }, null, 2)}\n`);
    if (!result.valid) process.exitCode = 1;
    return;
  }
  if (!evidencePath || !expectedSha) {
    process.stderr.write('Usage: node .ai/runtime/four-protocol-quality-gate.mjs --validate-policy | --evidence <envelope.json> --sha <candidate-40-char-sha>\n');
    process.exitCode = 2;
    return;
  }
  let trustedVerifiers;
  try {
    trustedVerifiers = JSON.parse(process.env.AFX_TRUSTED_VERIFIERS_JSON ?? '[]');
  } catch {
    process.stdout.write(`${JSON.stringify(failClosed('TRUSTED_VERIFIER_REGISTRY_JSON_INVALID'), null, 2)}\n`);
    process.exitCode = 2;
    return;
  }
  const envelope = JSON.parse(await readFile(evidencePath, 'utf8'));
  const result = evaluateEvidence({ policy, envelope, expectedSha, trustedVerifiers });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.release_eligible) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 2;
  });
}
