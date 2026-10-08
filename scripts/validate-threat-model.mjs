import fs from "node:fs";
import assert from "node:assert/strict";

const file = process.argv[2] ?? "docs/security/THREAT-MODEL-AUTHN-AUTHZ.md";
const text = fs.readFileSync(file, "utf8");

assert.match(text, /\*\*Control:\*\* G01-24/);
assert.match(text, /\*\*Status:\*\* REVIEW_REQUIRED/);

const requiredThreats = [
  "TM-01", "TM-04", "TM-06", "TM-07", "TM-08", "TM-09",
  "TM-10", "TM-11", "TM-12", "TM-13", "TM-14", "TM-15",
  "TM-16", "TM-17", "TM-18", "TM-19"
];

for (const id of requiredThreats) assert.match(text, new RegExp(id));
for (const control of [
  "G01-02", "G01-03", "G01-04", "G01-05", "G01-06",
  "G01-08", "G01-10", "G01-11", "G01-12", "G01-14",
  "G01-15", "G01-16", "G01-17", "G01-18", "G01-19",
  "G01-20", "G01-21", "G01-22", "G01-23", "G01-25", "G01-26"
]) assert.match(text, new RegExp(control));

console.log("PASS: G01-24 threat model contains required authentication/authorization abuse cases and Gate-01 control mappings.");
