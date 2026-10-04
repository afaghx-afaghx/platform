import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

test("active Pages HTML does not use root-relative local assets or routes", async () => {
  const files = await htmlFiles(PUBLIC);
  const violations = [];
  for (const file of files) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      const value = match[1];
      if (value.startsWith("/") && !value.startsWith("//")) {
        violations.push({ file: relative(PUBLIC, file), value });
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("login and dashboard resolve their shipped local assets relatively", async () => {
  for (const name of ["login.html", "dashboard.html"]) {
    const html = await readFile(join(PUBLIC, name), "utf8");
    assert.match(html, /href="\.\/styles\.css"/);
    assert.match(html, /src="\.\/app\.js"/);
  }
  const dashboard = await readFile(join(PUBLIC, "dashboard.html"), "utf8");
  assert.match(dashboard, /href="\.\/dashboard\.html"/);
});

test("canonical Services host is used; legacy service host is absent", async () => {
  const files = await htmlFiles(PUBLIC);
  const stale = [];
  for (const file of files) {
    const html = await readFile(file, "utf8");
    if (html.includes("https://service.afaghx.com")) stale.push(relative(PUBLIC, file));
  }
  assert.deepEqual(stale, []);
});

test("active HTML local references exist in the Pages payload", async () => {
  const files = await htmlFiles(PUBLIC);
  const missing = [];
  for (const file of files) {
    const html = await readFile(file, "utf8");
    for (const attr of ["href", "src"]) {
      for (const match of html.matchAll(new RegExp(attr + '=["\\\']([^"\\\']+)["\\\']', "g"))) {
        const value = match[1].split("?")[0].split("#")[0];
        if (!value || ["/", "http://", "https://", "mailto:", "javascript:"].some((prefix) => value.startsWith(prefix))) continue;
        const target = resolve(PUBLIC, relative(PUBLIC, file), "..", value);
        if (!target.startsWith(PUBLIC)) continue;
        try { await readFile(target); } catch { missing.push({ file: relative(PUBLIC,file), attr, value }); }
      }
    }
  }
  assert.deepEqual(missing, []);
});
