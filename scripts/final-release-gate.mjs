import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const phase = process.argv[2];
const pagesUrl = process.env.PAGES_URL || "https://afaghx-afaghx.github.io/platform/";
const releaseSha = process.env.RELEASE_SHA || "";

function fail(message) {
  console.error(`FINAL_RELEASE_GATE=FAIL: ${message}`);
  process.exit(1);
}

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function sha256File(path) {
  return crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
}

function pngDimensions(path) {
  const b = fs.readFileSync(path);
  if (b.length < 24 || b.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    fail(`invalid PNG: ${path}`);
  }
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20)
  };
}

function gitHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

if (phase === "static") {
  if (!/^https:\/\//.test(pagesUrl)) fail("PAGES_URL must use HTTPS");
  if (!releaseSha || !/^[0-9a-f]{40}$/.test(releaseSha)) fail("RELEASE_SHA must be a full 40-character SHA");
  const head = gitHead();
  if (head !== releaseSha) fail(`checked-out SHA ${head} does not equal RELEASE_SHA ${releaseSha}`);

  const index = read("experience/web/public/index.html");
  const css = read("experience/web/public/afaghx-brand.css");
  const logo = "experience/web/public/assets/brand/afaghx-approved-logo.png";

  if (!fs.existsSync(logo)) fail("approved logo asset missing");
  const dims = pngDimensions(logo);
  if (dims.width !== 1024 || dims.height !== 341) {
    fail(`approved logo dimensions are ${dims.width}x${dims.height}, expected 1024x341`);
  }

  const requiredIndex = [
    'lang="fa"',
    'dir="rtl"',
    'AFAGHX',
    'class="brand-logo"',
    './assets/brand/afaghx-approved-logo.png',
    'id="taxonomy-families"',
    '۳۴ سبد کالا'
  ];
  for (const token of requiredIndex) {
    if (!index.includes(token)) fail(`canonical index missing: ${token}`);
  }

  const requiredCss = [
    'height:108px',
    'height:88px',
    'height:78px',
    'height:68px',
    'aspect-ratio:1024 / 341'
  ];
  for (const token of requiredCss) {
    if (!css.includes(token)) fail(`canonical logo CSS missing: ${token}`);
  }

  if (/<optgroup/.test(index)) fail("legacy category optgroup detected");
  if (/localStorage|sessionStorage/.test(index)) fail("browser storage usage detected in canonical homepage");

  console.log(`FINAL_STATIC_PASS main_sha=${releaseSha} logo=${dims.width}x${dims.height}`);
  process.exit(0);
}

if (phase === "finalize") {
  const head = gitHead();
  if (head !== releaseSha) fail(`finalize SHA mismatch: ${head} != ${releaseSha}`);

  const desktop = "artifacts/final-release-runtime/final-release-desktop.png";
  const mobile = "artifacts/final-release-runtime/final-release-mobile.png";
  if (!fs.existsSync(desktop) || !fs.existsSync(mobile)) fail("runtime screenshots missing");

  const manifest = {
    product: "AFAGHX",
    release_status: "FINAL_RELEASE_PROVEN",
    version: `final-${releaseSha.slice(0, 12)}`,
    main_sha: releaseSha,
    pages_url: pagesUrl,
    pages_deploy_run_id: process.env.PAGES_RUN_ID || null,
    final_release_gate_run_id: process.env.FINAL_GATE_RUN_ID || null,
    final_release_gate_attempt: process.env.FINAL_GATE_RUN_ATTEMPT || null,
    browser_runtime: "PASS",
    final_verification: "PASS",
    approved_logo: {
      path: "experience/web/public/assets/brand/afaghx-approved-logo.png",
      source_dimensions: "1024x341",
      desktop_render_height_px: 108,
      tablet_render_height_px: 88,
      mobile_render_height_px: 78,
      small_mobile_render_height_px: 68
    },
    evidence: {
      desktop_screenshot_sha256: sha256File(desktop),
      mobile_screenshot_sha256: sha256File(mobile)
    },
    released_at_utc: new Date().toISOString()
  };

  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync("artifacts/final-release-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(
    "artifacts/final-release-manifest.md",
    [
      "# AFAGHX Final Release",
      "",
      `- Status: **FINAL_RELEASE_PROVEN**`,
      `- Version: ${manifest.version}`,
      `- Main SHA: ${manifest.main_sha}`,
      `- Pages URL: ${manifest.pages_url}`,
      `- Browser Runtime: ${manifest.browser_runtime}`,
      `- Final Verification: ${manifest.final_verification}`,
      `- Released at (UTC): ${manifest.released_at_utc}`
    ].join("\n") + "\n"
  );

  console.log(`FINAL_RELEASE_PROVEN=true VERSION=${manifest.version} MAIN_SHA=${manifest.main_sha}`);
  process.exit(0);
}

fail("unknown phase; use static or finalize");
