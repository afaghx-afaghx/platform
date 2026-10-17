import test from "node:test";
import assert from "node:assert/strict";
import {
  DNS_TYPE,
  PUBLIC_RESOLVERS,
  buildDohUrl,
  hasExpectedDnsAnswer,
  hasUsableAddressAnswer,
  extractAddresses,
  isExpectedFinalHost,
  isAcceptedApiContextStatus,
  evaluateCertificate,
  mapLimit
} from "./public-readiness-probe.mjs";

test("public DNS probes use distinct independent HTTPS resolver endpoints", () => {
  assert.equal(PUBLIC_RESOLVERS.length, 2);
  assert.notEqual(new URL(PUBLIC_RESOLVERS[0].endpoint).hostname, new URL(PUBLIC_RESOLVERS[1].endpoint).hostname);
  assert.equal(buildDohUrl(PUBLIC_RESOLVERS[0].endpoint, "api.afaghx.com", "A").includes("name=api.afaghx.com"), true);
});

test("delegation answers require NOERROR and the expected record type", () => {
  assert.equal(hasExpectedDnsAnswer({ http_ok: true, dns_status: 0, answers: [{ type: DNS_TYPE.NS, data: "ns1.example.net" }] }, "NS"), true);
  assert.equal(hasExpectedDnsAnswer({ http_ok: true, dns_status: 3, answers: [{ type: DNS_TYPE.NS, data: "ns1.example.net" }] }, "NS"), false);
  assert.equal(hasExpectedDnsAnswer({ http_ok: false, dns_status: 0, answers: [{ type: DNS_TYPE.SOA }] }, "SOA"), false);
  assert.equal(hasExpectedDnsAnswer({ http_ok: true, dns_status: 0, answers: [] }, "SOA"), false);
  assert.equal(hasExpectedDnsAnswer({ http_ok: true, dns_status: 0, answers: [{ type: DNS_TYPE.NS }] }, "SOA"), false);
});

test("host resolution requires at least one returned public A or AAAA answer", () => {
  assert.equal(hasUsableAddressAnswer([{ http_ok: true, dns_status: 0, answers: [{ type: DNS_TYPE.A, data: "192.0.2.10" }] }]), true);
  assert.equal(hasUsableAddressAnswer([{ http_ok: true, dns_status: 0, answers: [{ type: DNS_TYPE.AAAA, data: "2001:db8::10" }] }]), true);
  assert.equal(hasUsableAddressAnswer([{ http_ok: true, dns_status: 0, answers: [{ type: DNS_TYPE.CNAME, data: "target.example.net" }] }]), false);
  assert.equal(hasUsableAddressAnswer([{ http_ok: true, dns_status: 3, answers: [] }]), false);
  assert.equal(hasUsableAddressAnswer([{ http_ok: false, dns_status: 0, answers: [{ type: DNS_TYPE.A, data: "192.0.2.10" }] }]), false);
});

test("address inventory deduplicates A and AAAA answers and retains record type", () => {
  const rows = extractAddresses([
    { http_ok: true, dns_status: 0, answers: [
      { type: DNS_TYPE.A, data: "192.0.2.20", ttl: 60 },
      { type: DNS_TYPE.A, data: "192.0.2.20", ttl: 30 }
    ] },
    { http_ok: true, dns_status: 0, answers: [{ type: DNS_TYPE.AAAA, data: "2001:db8::20", ttl: 90 }] }
  ]);
  assert.deepEqual(rows.map((row) => [row.address, row.record_type]), [
    ["192.0.2.20", "A"], ["2001:db8::20", "AAAA"]
  ]);
});

test("HTTPS endpoint must stay HTTPS and preserve its canonical host", () => {
  assert.equal(isExpectedFinalHost("api.afaghx.com", "https://api.afaghx.com/v1/auth/context", "api", "afaghx.com"), true);
  assert.equal(isExpectedFinalHost("api.afaghx.com", "https://other.example/v1/auth/context", "api", "afaghx.com"), false);
  assert.equal(isExpectedFinalHost("admin.afaghx.com", "https://www.afaghx.com/", "module", "afaghx.com"), false);
  assert.equal(isExpectedFinalHost("afaghx.com", "https://www.afaghx.com/", "apex-alias", "afaghx.com"), true);
  assert.equal(isExpectedFinalHost("afaghx.com", "https://afaghx.com/", "apex-alias", "afaghx.com"), false);
  assert.equal(isExpectedFinalHost("api.afaghx.com", "http://api.afaghx.com/", "api", "afaghx.com"), false);
});

test("unauthenticated API context only accepts documented statuses", () => {
  for (const status of [200, 401, 403]) assert.equal(isAcceptedApiContextStatus(status), true);
  for (const status of [0, 201, 302, 404, 429, 500]) assert.equal(isAcceptedApiContextStatus(status), false);
});

test("certificate health fails closed on bad chain, identity, time, or near expiry", () => {
  const now = Date.parse("2026-10-17T00:00:00Z");
  const valid = {
    authorized: true, identityError: null,
    validFrom: "Oct 1 00:00:00 2026 GMT", validTo: "Nov 30 00:00:00 2026 GMT"
  };
  assert.equal(evaluateCertificate(valid, now, 7).ok, true);
  assert.equal(evaluateCertificate({ ...valid, authorized: false }, now, 7).ok, false);
  assert.equal(evaluateCertificate({ ...valid, identityError: "hostname mismatch" }, now, 7).ok, false);
  assert.equal(evaluateCertificate({ ...valid, validFrom: "Nov 1 00:00:00 2026 GMT" }, now, 7).ok, false);
  assert.equal(evaluateCertificate({ ...valid, validTo: "Oct 20 00:00:00 2026 GMT" }, now, 7).ok, false);
  assert.equal(evaluateCertificate({ ...valid, validTo: "Oct 16 00:00:00 2026 GMT" }, now, 7).ok, false);
});

test("bounded concurrency preserves input ordering", async () => {
  const values = await mapLimit([3, 1, 2], 2, async (value) => value * 2);
  assert.deepEqual(values, [6, 2, 4]);
});
