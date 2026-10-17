import fs from "node:fs/promises";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";

export const DNS_TYPE = Object.freeze({ A: 1, NS: 2, CNAME: 5, SOA: 6, AAAA: 28 });
export const PUBLIC_RESOLVERS = Object.freeze([
  { id: "google-public-dns", endpoint: "https://dns.google/resolve", accept: "application/dns-json" },
  { id: "cloudflare-public-dns", endpoint: "https://cloudflare-dns.com/dns-query", accept: "application/dns-json" }
]);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "../..");
const DEFAULT_REPORT = process.env.RUNNER_TEMP
  ? path.join(process.env.RUNNER_TEMP, "afaghx-public-readiness", "public-readiness.json")
  : path.resolve(process.cwd(), "public-readiness.json");
const REQUEST_TIMEOUT_MS = 10000;
const TLS_TIMEOUT_MS = 8000;
const MIN_CERT_DAYS = Number(process.env.AFX_MIN_TLS_VALIDITY_DAYS || "7");

export function resolveEvidenceIdentity({ eventName, checkoutSha, eventPayload } = {}) {
  const pullRequest = eventPayload?.pull_request;
  const headSha = typeof pullRequest?.head?.sha === "string" ? pullRequest.head.sha : null;
  const baseSha = typeof pullRequest?.base?.sha === "string" ? pullRequest.base.sha : null;
  const isPullRequest = eventName === "pull_request" && headSha;
  const candidateSha = isPullRequest
    ? headSha
    : (typeof checkoutSha === "string" && checkoutSha ? checkoutSha : null);
  return {
    event_name: eventName || null,
    checkout_sha: checkoutSha || null,
    commit_sha: candidateSha,
    candidate_sha: candidateSha,
    candidate_head_sha: isPullRequest ? headSha : candidateSha,
    candidate_base_sha: isPullRequest ? baseSha : null,
    candidate_ref: isPullRequest ? pullRequest.head?.ref || null : eventPayload?.ref || null,
    base_ref: isPullRequest ? pullRequest.base?.ref || null : null,
    sha_basis: isPullRequest ? "pull_request.head.sha" : candidateSha ? "workflow_checkout_sha" : "unavailable"
  };
}

async function readEventPayload(eventPath) {
  if (!eventPath) return null;
  try {
    return JSON.parse(await fs.readFile(eventPath, "utf8"));
  } catch {
    return null;
  }
}

export function buildDohUrl(endpoint, name, type) {
  const url = new URL(endpoint);
  url.searchParams.set("name", name);
  url.searchParams.set("type", type);
  return url.toString();
}
export function hasExpectedDnsAnswer(response, qtype) {
  if (!response || response.http_ok !== true || response.dns_status !== 0) return false;
  const expected = DNS_TYPE[String(qtype).toUpperCase()];
  if (!expected) return false;
  return (response.answers || []).some((record) => record.type === expected);
}
export function hasUsableAddressAnswer(responses) {
  return (responses || []).some((response) =>
    response?.http_ok === true && response?.dns_status === 0 &&
    (response.answers || []).some((record) => record.type === DNS_TYPE.A || record.type === DNS_TYPE.AAAA)
  );
}
export function extractAddresses(responses) {
  const records = [];
  for (const response of responses || []) {
    if (response?.http_ok !== true || response?.dns_status !== 0) continue;
    for (const answer of response.answers || []) {
      if (answer.type !== DNS_TYPE.A && answer.type !== DNS_TYPE.AAAA) continue;
      const address = String(answer.data || "").trim();
      if (address && !records.some((row) => row.address === address)) {
        records.push({ address, record_type: answer.type === DNS_TYPE.A ? "A" : "AAAA", ttl_seconds: Number.isFinite(answer.ttl) ? answer.ttl : null });
      }
    }
  }
  return records;
}
export function isExpectedFinalHost(expectedHost, finalUrl, role, apexHost) {
  let parsed;
  try { parsed = new URL(finalUrl); } catch { return false; }
  if (parsed.protocol !== "https:") return false;
  const actual = parsed.hostname.toLowerCase();
  if (role === "apex-alias") return actual === ("www." + String(apexHost)).toLowerCase();
  return actual === String(expectedHost).toLowerCase();
}
export function isAcceptedApiContextStatus(status) {
  return [200, 401, 403].includes(Number(status));
}
export function evaluateCertificate({ authorized, identityError = null, validFrom, validTo }, now = Date.now(), minimumDays = MIN_CERT_DAYS) {
  const start = Date.parse(validFrom || "");
  const end = Date.parse(validTo || "");
  const minimumMs = Math.max(0, Number(minimumDays) || 0) * 86400000;
  const dateValid = Number.isFinite(start) && Number.isFinite(end) && start <= now && end > now;
  const freshnessValid = Number.isFinite(end) && end - now > minimumMs;
  return {
    authorized: authorized === true, identity_valid: !identityError, date_valid: dateValid,
    freshness_valid: freshnessValid,
    days_until_expiry: Number.isFinite(end) ? Math.floor((end - now) / 86400000) : null,
    ok: authorized === true && !identityError && dateValid && freshnessValid
  };
}
export async function mapLimit(items, limit, mapper) {
  const result = new Array(items.length);
  let next = 0;
  const count = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: count }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      result[index] = await mapper(items[index], index);
    }
  }));
  return result;
}
async function queryDns(resolver, name, qtype) {
  const result = {
    resolver: resolver.id, qname: name, qtype, observed_at: new Date().toISOString(),
    http_ok: false, http_status: null, dns_status: null, dns_status_text: null,
    answers: [], authority: [], error: null
  };
  try {
    const response = await fetch(buildDohUrl(resolver.endpoint, name, qtype), {
      headers: { accept: resolver.accept, "user-agent": "AFAGHX-Public-Infra-Readiness/1.0" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: "error"
    });
    result.http_status = response.status;
    result.http_ok = response.ok;
    if (!response.ok) { result.error = "dns_over_https_http_error"; return result; }
    const payload = await response.json();
    result.dns_status = Number.isInteger(payload.Status) ? payload.Status : null;
    result.dns_status_text = ({ 0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 4: "NOTIMP", 5: "REFUSED" })[result.dns_status] || "UNKNOWN";
    result.answers = (Array.isArray(payload.Answer) ? payload.Answer : []).map((answer) => ({
      name: answer.name || null, type: answer.type, ttl: Number.isFinite(answer.TTL) ? answer.TTL : null,
      data: typeof answer.data === "string" ? answer.data : null
    }));
    result.authority = (Array.isArray(payload.Authority) ? payload.Authority : []).map((answer) => ({
      name: answer.name || null, type: answer.type, ttl: Number.isFinite(answer.TTL) ? answer.TTL : null,
      data: typeof answer.data === "string" ? answer.data : null
    }));
  } catch (error) {
    result.error = { name: error?.name || "Error", code: error?.cause?.code || error?.code || null, message: String(error?.message || error).slice(0, 400) };
  }
  return result;
}
function chooseAddress(addresses) {
  return addresses.find((row) => row.record_type === "A") || addresses[0] || null;
}
function checkTls(hostname, address, minimumDays) {
  return new Promise((resolve) => {
    let settled = false;
    const started = Date.now();
    const finish = (payload, socket) => {
      if (settled) return;
      settled = true;
      try { socket?.destroy(); } catch {}
      resolve({ hostname, address, observed_at: new Date().toISOString(), duration_ms: Date.now() - started, ...payload });
    };
    let socket;
    try {
      socket = tls.connect({
        host: address, port: 443, servername: hostname, rejectUnauthorized: false,
        ALPNProtocols: ["h2", "http/1.1"], timeout: TLS_TIMEOUT_MS
      });
      socket.once("secureConnect", () => {
        const certificate = socket.getPeerCertificate();
        const identityError = certificate && Object.keys(certificate).length
          ? tls.checkServerIdentity(hostname, certificate) : new Error("peer_certificate_missing");
        const health = evaluateCertificate({
          authorized: socket.authorized, identityError: identityError?.message || null,
          validFrom: certificate?.valid_from, validTo: certificate?.valid_to
        }, Date.now(), minimumDays);
        finish({
          ok: health.ok, tls_authorized: socket.authorized === true,
          authorization_error: socket.authorizationError || null, identity_error: identityError?.message || null,
          subject: certificate?.subject || null, issuer: certificate?.issuer || null,
          subject_alt_name: certificate?.subjectaltname || null,
          valid_from: certificate?.valid_from || null, valid_to: certificate?.valid_to || null,
          days_until_expiry: health.days_until_expiry, certificate_checks: health, alpn_protocol: socket.alpnProtocol || null
        }, socket);
      });
      socket.once("timeout", () => {
        const error = new Error("tls_handshake_timeout"); error.code = "TLS_TIMEOUT"; socket.destroy(error);
      });
      socket.once("error", (error) => finish({
        ok: false, tls_authorized: false,
        error: { name: error?.name || "Error", code: error?.code || null, message: String(error?.message || error).slice(0, 400) }
      }, socket));
    } catch (error) {
      finish({
        ok: false, tls_authorized: false,
        error: { name: error?.name || "Error", code: error?.code || null, message: String(error?.message || error).slice(0, 400) }
      }, socket);
    }
  });
}
export function assessDomainRegistration({
  apexHost, objectClassName, ldhName, unicodeName, status, nameservers, events, now = Date.now()
} = {}) {
  const expected = String(apexHost || "").toLowerCase();
  const actual = String(ldhName || unicodeName || "").toLowerCase();
  const statusValues = Array.isArray(status) ? status.map((value) => String(value)) : [];
  const nsValues = Array.isArray(nameservers)
    ? nameservers.map((item) => typeof item === "string" ? item : String(item.ldhName || item.unicodeName || "")).filter(Boolean)
    : [];
  const eventValues = Array.isArray(events) ? events : [];
  const registration = eventValues.find((item) => /registration/i.test(String(item.eventAction || "")));
  const expiration = eventValues.find((item) => /expir/i.test(String(item.eventAction || "")));
  const registrationDate = registration?.eventDate || null;
  const expirationDate = expiration?.eventDate || null;
  const normalizedStatuses = statusValues.map((value) => value.toLowerCase().replace(/[\s_-]/g, ""));
  const blocked = normalizedStatuses.some((value) =>
    ["clienthold", "serverhold", "inactive", "pendingdelete", "redemptionperiod", "pendingrestore"].includes(value)
  );
  const expiry = Date.parse(expirationDate || "");
  const expiryValid = Number.isFinite(expiry) && expiry > now;
  const checks = {
    registry_domain_record_present: objectClassName === "domain",
    canonical_domain_name_match: expected !== "" && actual === expected,
    at_least_two_registry_nameservers: nsValues.length >= 2,
    no_dns_blocking_registry_status: !blocked,
    unexpired_registration_evidence: expiryValid
  };
  return {
    registered: checks.registry_domain_record_present,
    domain_name_matches: checks.canonical_domain_name_match,
    status: statusValues,
    nameservers: nsValues,
    registration_date: registrationDate,
    expiration_date: expirationDate,
    checks,
    ok: Object.values(checks).every(Boolean)
  };
}

async function probeDomainRegistration(apexHost) {
  const result = {
    registry: "Verisign .com RDAP",
    queried_domain: apexHost,
    observed_at: new Date().toISOString(),
    http_status: null,
    registered: false,
    domain_name_matches: false,
    nameservers: [],
    status: [],
    registrar: null,
    registration_date: null,
    expiration_date: null,
    ok: false,
    error: null
  };
  if (!apexHost.toLowerCase().endsWith(".com")) {
    result.error = "rdap_registry_adapter_not_configured_for_tld";
    return result;
  }
  try {
    const endpoint = "https://rdap.verisign.com/com/v1/domain/" + encodeURIComponent(apexHost);
    const response = await fetch(endpoint, {
      headers: { accept: "application/rdap+json, application/json", "user-agent": "AFAGHX-Public-Infra-Readiness/1.0" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: "error"
    });
    result.http_status = response.status;
    if (!response.ok) {
      result.error = response.status === 404 ? "registry_rdap_reports_domain_not_found" : "registry_rdap_http_error";
      return result;
    }
    const payload = await response.json();
    Object.assign(result, assessDomainRegistration({
      apexHost,
      objectClassName: payload.objectClassName,
      ldhName: payload.ldhName,
      unicodeName: payload.unicodeName,
      status: payload.status,
      nameservers: payload.nameservers,
      events: payload.events,
      now: Date.now()
    }));
    const registrarEntity = (Array.isArray(payload.entities) ? payload.entities : [])
      .find((entity) => Array.isArray(entity.roles) && entity.roles.includes("registrar"));
    result.registrar = registrarEntity ? {
      handle: registrarEntity.handle || null,
      name: registrarEntity.vcardArray?.[1]?.find?.((item) => item?.[0] === "fn")?.[3] || null
    } : null;
    if (!result.ok) result.error = "domain_registration_or_delegation_metadata_failed_acceptance";
  } catch (error) {
    result.error = {
      name: error?.name || "Error",
      code: error?.cause?.code || error?.code || null,
      message: String(error?.message || error).slice(0, 400)
    };
  }
  return result;
}

async function probeHttps(entry, apexHost) {
  const started = Date.now();
  const url = entry.role === "api" ? new URL("/v1/auth/context", entry.api_base).toString() : "https://" + entry.host + "/";
  const result = {
    host: entry.host, id: entry.id, slug: entry.slug, role: entry.role, requested_url: url,
    observed_at: new Date().toISOString(), duration_ms: null, reachable: false, status: null,
    final_url: null, final_host: null, content_type: null, hsts: null, server: null, error: null, ok: false
  };
  try {
    const response = await fetch(url, {
      redirect: "follow", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        accept: entry.role === "api" ? "application/json" : "text/html,application/xhtml+xml",
        "user-agent": "AFAGHX-Public-Infra-Readiness/1.0"
      }
    });
    result.reachable = true;
    result.status = response.status;
    result.final_url = response.url;
    result.final_host = new URL(response.url).hostname;
    result.content_type = response.headers.get("content-type");
    result.hsts = response.headers.get("strict-transport-security");
    result.server = response.headers.get("server");
    const finalHostValid = isExpectedFinalHost(entry.host, response.url, entry.role, apexHost);
    const statusValid = entry.role === "api" ? isAcceptedApiContextStatus(response.status) : response.status >= 200 && response.status < 300;
    const contentTypeValid = entry.role === "api"
      ? String(result.content_type || "").toLowerCase().includes("application/json")
      : String(result.content_type || "").toLowerCase().includes("text/html");
    const hstsValid = entry.role === "api" ? Boolean(result.hsts) : true;
    result.checks = {
      accepted_status: statusValid, https_final_url: new URL(response.url).protocol === "https:",
      final_host_matches_contract: finalHostValid, content_type_matches_contract: contentTypeValid,
      hsts_present_for_api: hstsValid
    };
    result.ok = statusValid && finalHostValid && contentTypeValid && hstsValid;
    try { await response.body?.cancel(); } catch {}
  } catch (error) {
    result.error = {
      name: error?.name || "Error", code: error?.cause?.code || error?.code || null,
      message: String(error?.message || error).slice(0, 500),
      cause_message: String(error?.cause?.message || "").slice(0, 300) || null
    };
  }
  result.duration_ms = Date.now() - started;
  return result;
}
function summarize(report) {
  const failures = [];
  if (!report.domain_registration.ok) failures.push("domain_registration_not_verified");
  if (!report.apex_delegation.ok) failures.push("apex_delegation_not_healthy");
  for (const host of report.hosts) {
    for (const resolver of host.resolver_checks) {
      if (!resolver.ok) failures.push("dns_unresolved:" + host.host + ":" + resolver.resolver);
      if (resolver.tls_ok !== true) failures.push("tls_invalid:" + host.host + ":" + resolver.resolver);
    }
  }
  for (const check of report.https_checks) if (!check.ok) failures.push("https_runtime_failed:" + (check.host || check.slug));
  return {
    generated_at: report.generated_at, source_commit: report.source.candidate_sha, checkout_sha: report.source.checkout_sha, candidate_head_sha: report.source.candidate_head_sha, workflow_run_id: report.source.workflow_run_id,
    apex_delegation: report.apex_delegation.ok ? "PASS" : "RED",
    required_dns_hosts: report.hosts.length,
    dns_resolved_on_both_public_resolvers: report.hosts.filter((host) => host.ok_on_both_resolvers).length,
    tls_valid_for_all_hosts_on_both_resolvers: report.hosts.length > 0 && report.hosts.every((host) => host.tls_valid_on_both_resolvers),
    https_runtime_checks_passed: report.https_checks.filter((item) => item.ok).length,
    https_runtime_checks_total: report.https_checks.length, failure_count: failures.length, failures,
    readiness: failures.length === 0 ? "PASS" : "RED", production_status: "NOT_PROVEN",
    note: "Public DNS, TLS and HTTP reachability are infrastructure prerequisites only; they do not prove module implementation, AFX-CORE security, tenant isolation, RBAC, persistence or release approval."
  };
}
export async function runPublicReadinessProbe({
  registryPath = path.join(ROOT, "experience/module-registry.json"),
  reportPath = process.env.AFX_PUBLIC_READINESS_REPORT || DEFAULT_REPORT,
  minimumCertificateValidityDays = MIN_CERT_DAYS,
  concurrency = 8
} = {}) {
  const eventPayload = await readEventPayload(process.env.GITHUB_EVENT_PATH);
  const evidenceIdentity = resolveEvidenceIdentity({
    eventName: process.env.GITHUB_EVENT_NAME,
    checkoutSha: process.env.GITHUB_SHA,
    eventPayload
  });
  const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
  if (!Array.isArray(registry.modules) || registry.modules.length !== registry.count) throw new Error("canonical_experience_registry_cardinality_invalid");
  const seenHosts = new Set();
  for (const module of registry.modules) {
    const hostname = String(module.host || "").toLowerCase();
    if (!hostname || seenHosts.has(hostname)) throw new Error("canonical_experience_registry_host_missing_or_duplicate");
    seenHosts.add(hostname);
  }
  const mainEntry = registry.modules.find((module) => module.type === "main-site");
  const apiEntry = registry.modules.find((module) => module.type === "platform-spine" || module.slug === "api");
  if (!mainEntry?.host?.startsWith("www.")) throw new Error("canonical_main_host_must_be_www_subdomain");
  if (!apiEntry?.host || !apiEntry?.api_base) throw new Error("canonical_api_entrypoint_missing");
  const apiBase = new URL(apiEntry.api_base);
  if (apiBase.protocol !== "https:" || apiBase.hostname !== apiEntry.host || apiBase.username || apiBase.password || apiBase.search || apiBase.hash) {
    throw new Error("api_base_must_be_canonical_https_url_from_registry");
  }
  const apexHost = mainEntry.host.replace(/^www\./i, "");
  if (!apexHost || apexHost === mainEntry.host) throw new Error("could_not_derive_apex_from_canonical_main_host");

  const entries = registry.modules.map((module) => ({
    id: module.id, slug: module.slug, name: module.name, host: module.host,
    role: module.type === "main-site" ? "main" : module.type === "platform-spine" || module.slug === "api" ? "api" : "module",
    api_base: module.api_base || (module.slug === "api" ? apiEntry.api_base : null)
  }));
  entries.push({ id: "AFX-APEX-ALIAS-001", slug: "apex", name: "AFAGHX Apex Redirect", host: apexHost, role: "apex-alias", api_base: null });

  const specs = [
    { qname: apexHost, qtype: "NS", purpose: "apex-delegation" },
    { qname: apexHost, qtype: "SOA", purpose: "apex-authoritative-zone" }
  ];
  for (const entry of entries) for (const qtype of ["A", "AAAA", "CNAME"]) specs.push({ qname: entry.host, qtype, purpose: "host-resolution" });
  const allSpecs = specs.flatMap((spec) => PUBLIC_RESOLVERS.map((resolver) => ({ ...spec, resolver })));
  const dnsResults = await mapLimit(allSpecs, concurrency, (spec) =>
    queryDns(spec.resolver, spec.qname, spec.qtype)
  );
  const dnsByKey = new Map(dnsResults.map((result) => [
    result.resolver + "|" + result.qname + "|" + result.qtype, result
  ]));
  const findDns = (resolverId, qname, qtype) => dnsByKey.get(resolverId + "|" + qname + "|" + qtype);

  const delegationChecks = PUBLIC_RESOLVERS.map((resolver) => {
    const ns = findDns(resolver.id, apexHost, "NS");
    const soa = findDns(resolver.id, apexHost, "SOA");
    return {
      resolver: resolver.id, ns_query_passed: hasExpectedDnsAnswer(ns, "NS"),
      soa_query_passed: hasExpectedDnsAnswer(soa, "SOA"),
      ok: hasExpectedDnsAnswer(ns, "NS") && hasExpectedDnsAnswer(soa, "SOA"),
      ns_query: ns, soa_query: soa
    };
  });
  const apexDelegation = {
    apex_host: apexHost, resolver_checks: delegationChecks,
    ok: delegationChecks.length === PUBLIC_RESOLVERS.length && delegationChecks.every((item) => item.ok)
  };

  const hosts = entries.map((entry) => {
    const resolverRows = PUBLIC_RESOLVERS.map((resolver) => {
      const queries = ["A", "AAAA", "CNAME"].map((qtype) => findDns(resolver.id, entry.host, qtype));
      const addressQueries = queries.filter((query) => query && ["A", "AAAA"].includes(query.qtype));
      return {
        resolver: resolver.id, ok: hasUsableAddressAnswer(addressQueries), queries,
        addresses: extractAddresses(addressQueries), tls_ok: false
      };
    });
    return {
      id: entry.id, slug: entry.slug, name: entry.name, host: entry.host, role: entry.role,
      runtime_url: entry.role === "api" ? new URL("/v1/auth/context", entry.api_base).toString() : "https://" + entry.host + "/",
      resolver_checks: resolverRows,
      ok_on_both_resolvers: resolverRows.length === PUBLIC_RESOLVERS.length && resolverRows.every((item) => item.ok),
      tls_valid_on_both_resolvers: false
    };
  });
  const tlsTasks = [];
  for (const host of hosts) for (const resolver of host.resolver_checks) {
    const address = chooseAddress(resolver.addresses);
    tlsTasks.push({ hostname: host.host, resolver: resolver.resolver, address: address?.address || null });
  }
  const tlsResults = await mapLimit(tlsTasks, concurrency, async (item) => {
    if (!item.address) return {
      hostname: item.hostname, resolver: item.resolver, address: null, observed_at: new Date().toISOString(),
      ok: false, skipped: true, error: "no_public_a_or_aaaa_address"
    };
    return { ...(await checkTls(item.hostname, item.address, minimumCertificateValidityDays)), resolver: item.resolver };
  });
  const tlsByKey = new Map(tlsResults.map((item) => [item.hostname + "|" + item.resolver, item]));
  for (const host of hosts) {
    for (const resolver of host.resolver_checks) {
      resolver.tls = tlsByKey.get(host.host + "|" + resolver.resolver);
      resolver.tls_ok = resolver.tls?.ok === true;
    }
    host.tls_valid_on_both_resolvers = host.resolver_checks.every((item) => item.tls_ok === true);
  }
  const httpsChecks = await mapLimit(entries, Math.max(3, Math.min(6, concurrency)), (entry) => probeHttps(entry, apexHost));
  const report = {
    spec: "AFX-PUBLIC-INFRASTRUCTURE-READINESS-EVIDENCE-001", version: "1.0.0", generated_at: new Date().toISOString(),
    source: {
      repository: process.env.GITHUB_REPOSITORY || registry.repository || "afaghx-afaghx/platform",
      ...evidenceIdentity,
      workflow_name: process.env.GITHUB_WORKFLOW || null,
      workflow_run_id: process.env.GITHUB_RUN_ID || null, workflow_run_attempt: process.env.GITHUB_RUN_ATTEMPT || null,
      workflow_ref: process.env.GITHUB_WORKFLOW_REF || null,
      workflow_run_url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
        ? process.env.GITHUB_SERVER_URL + "/" + process.env.GITHUB_REPOSITORY + "/actions/runs/" + process.env.GITHUB_RUN_ID : null
    },
    policy: {
      independent_public_resolvers: PUBLIC_RESOLVERS.map(({ id, endpoint }) => ({ id, endpoint })),
      minimum_certificate_validity_days: minimumCertificateValidityDays,
      apex_host: apexHost, expected_api_context_path: "/v1/auth/context",
      accepted_unauthenticated_api_statuses: [200, 401, 403],
      expected_tls: "Valid CA chain, hostname identity, active dates and configured freshness horizon",
      mutation_policy: "Read-only diagnostics. Does not change DNS, registrar delegation, hosting configuration, or secrets."
    },
    domain_registration: await probeDomainRegistration(apexHost),
    apex_delegation: apexDelegation, hosts, tls_checks: tlsResults, https_checks: httpsChecks, summary: null
  };
  report.summary = summarize(report);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify(report.summary, null, 2));
  console.log("Evidence report written to: " + reportPath);
  return report;
}
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const report = await runPublicReadinessProbe();
    if (report.summary.readiness !== "PASS") {
      console.error("FAIL-CLOSED: public infrastructure readiness is RED; inspect the uploaded raw evidence artifact.");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(JSON.stringify({
      spec: "AFX-PUBLIC-INFRASTRUCTURE-READINESS-ERROR-001", observed_at: new Date().toISOString(),
      error: String(error?.message || error)
    }, null, 2));
    process.exitCode = 2;
  }
}
