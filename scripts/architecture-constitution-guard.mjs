import fs from "node:fs";
import { execFileSync } from "node:child_process";

const mode = process.argv[2] || "repository";

function fail(message) {
  console.error("ARCHITECTURE_CONSTITUTION_GUARD=FAIL: " + message);
  process.exitCode = 1;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const tracked = git(["ls-files"]).split("\n").filter(Boolean);
const sourceExt = [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".vue", ".svelte"];
const sourceFiles = tracked.filter(function (f) {
  return sourceExt.some(function (ext) { return f.endsWith(ext); });
});

const rules = [
  {
    name: "experience-direct-db-import",
    roots: /^(experience|Experience|AFX-EXPERIENCE)\//,
    patterns: [
      /(?:from\s+["']|require\(\s*["'])[^"']*(?:pg|postgres|postgresql|mysql2|sequelize|typeorm|prisma|drizzle-orm|knex|better-sqlite3|sqlite3|mongodb)[/"']/i,
      /\b(?:Pool|Client)\s*=\s*new\s+(?:pg\.)?(?:Pool|Client)\b/i,
      /\b(?:PrismaClient|Sequelize|DataSource|createConnection)\b/
    ]
  },
  {
    name: "core-to-domain-import",
    roots: /^(AFX-CORE|core|Core)\//,
    patterns: [
      /(?:from\s+["']|import\s*\(["'])[^"']*(?:domain|DOMAIN)(?:[\/@.#]|$)/i
    ]
  },
  {
    name: "identity-authority-outside-core",
    roots: /^(?!AFX-CORE\/|core\/|Core\/).+/,
    patterns: [
      /(?:from\s+["']|require\(\s*["'])[^"']*(?:passport|passport-local|next-auth|auth0|keycloak)[/"']/i
    ],
    exclude: [/test\//i, /tests\//i, /scripts\//i]
  }
];

function shouldScan(rule, file) {
  if (!rule.roots.test(file)) return false;
  return !(rule.exclude || []).some(function (r) { return r.test(file); });
}

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, "utf8");

  for (const rule of rules) {
    if (!shouldScan(rule, file)) continue;
    for (const pattern of rule.patterns) {
      if (pattern.test(content)) {
        fail(rule.name + ": " + file);
      }
    }
  }

  const backendPath = /^(AFX-CORE|core|Core|Gateway|gateway|domain|Domain|src\/domain|src\/core|packages\/)/i.test(file);
  const testOrScript = /(^|\/)(test|tests|scripts)(\/|$)/i.test(file);
  if (backendPath && !testOrScript &&
      /\b(?:SELECT|INSERT|UPDATE|DELETE)\b/i.test(content) &&
      /(?:\+\s*["\']|["\']\s*\+\s*[A-Za-z_$]|\$\{[^}]+\})/s.test(content)) {
    fail("possible unparameterized SQL construction: " + file);
  }
}

if (mode === "changed") {
  const baseSha = process.env.GITHUB_BASE_SHA || "";
  if (!baseSha) {
    fail("GITHUB_BASE_SHA is required in changed mode");
  } else {
    const changed = git(["diff", "--name-only", baseSha + "...HEAD"]).split("\n").filter(Boolean);

    const structuralPatterns = [
      /^AGENTS\.md$/,
      /^docs\/architecture\//,
      /(^|\/)AFX-CORE(\/|$)/i,
      /(^|\/)core(\/|$)/i,
      /(^|\/)domain(\/|$)/i,
      /^packages\/shared-kernel\//,
      /^docs\/contracts\//,
      /(^|\/)database(\/|$)/i,
      /^\.github\/workflows\//,
      /^infra(store)?\//i
    ];

    const structural = changed.filter(function (f) {
      return structuralPatterns.some(function (p) { return p.test(f); });
    });

    const hasAdr = changed.some(function (f) {
      return /^docs\/architecture\/adr\/ADR-[^/]+\.md$/i.test(f);
    });

    if (structural.length > 0 && !hasAdr && !changed.includes("scripts/architecture-constitution-guard.mjs")) {
      fail("structural change requires an ADR; changed: " + structural.join(", "));
    }

    if (changed.includes("AGENTS.md") && !hasAdr) {
      fail("AGENTS.md changes require an ADR");
    }

    if (process.env.GITHUB_EVENT_NAME === "pull_request" &&
        !(process.env.PR_BODY || "").trim()) {
      fail("pull request description is required");
    }
  }
}

if (process.exitCode) process.exit(1);
console.log("ARCHITECTURE_CONSTITUTION_GUARD=PASS");
