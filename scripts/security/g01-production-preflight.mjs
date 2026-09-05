import { writeFileSync } from 'node:fs';

const checks = [
  ['KMS_PROVIDER', 'G01-20 KMS/HSM provider'],
  ['KMS_KEY_ID', 'G01-20 current key identifier'],
  ['WORKLOAD_IDENTITY_ISSUER', 'G01-21 workload identity issuer'],
  ['WORKLOAD_IDENTITY_AUDIENCE', 'G01-21 workload identity audience'],
  ['WORKLOAD_IDENTITY_SUBJECT', 'G01-21 workload identity subject'],
  ['TLS_TERMINATION_VERIFIED', 'G01-19 TLS termination evidence'],
  ['APPROVED_CORS_ORIGINS', 'G01-19 approved CORS origins'],
  ['RATE_LIMIT_BACKEND', 'G01-17 shared rate-limit backend'],
  ['MFA_WEBAUTHN_DURABLE_STORE', 'G01-14/G01-15 durable identity store'],
  ['PENTEST_REPORT_SHA256', 'G01-25 independent penetration-test artifact']
];

const results = checks.map(([name, description]) => ({
  name,
  description,
  present: Boolean(process.env[name]?.trim())
}));

const report = {
  schema: 'afx.g01.production-preflight/v1',
  generatedAt: new Date().toISOString(),
  policy: 'fail-closed',
  environment: process.env.NODE_ENV || 'unspecified',
  checks: results,
  missing: results.filter((item) => !item.present).map((item) => item.name),
  decision: results.every((item) => item.present) ? 'READY_FOR_PRODUCTION_EVIDENCE' : 'BLOCKED'
};

writeFileSync('g01-production-preflight.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.decision !== 'READY_FOR_PRODUCTION_EVIDENCE') process.exit(1);
