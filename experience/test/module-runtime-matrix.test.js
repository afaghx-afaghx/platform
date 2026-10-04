import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const matrixPath = new URL("../module-runtime-matrix.json", import.meta.url);
const registryPath = new URL("../module-registry.json", import.meta.url);

test("matrix contract validates against canonical registry", async () => {
  const code = await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ["validate-module-runtime-matrix.mjs"], { cwd: root });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    p.on("error", reject);
    p.on("close", (status) => resolve({ status, out, err }));
  });
  assert.equal(code.status, 0, code.err || code.out);
});

test("matrix contains exactly the 17 non-main registry entrypoints", async () => {
  const [matrix, registry] = await Promise.all([
    readFile(matrixPath, "utf8").then(JSON.parse),
    readFile(registryPath, "utf8").then(JSON.parse)
  ]);
  assert.equal(matrix.modules.length, 17);
  assert.deepEqual(
    [...matrix.modules.map((m) => m.slug)].sort(),
    registry.modules.filter((m) => m.type !== "main-site").map((m) => m.slug).sort()
  );
});

test("matrix never treats an unproven row as proven", async () => {
  const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
  for (const row of matrix.modules) {
    assert.notEqual(row.Evidence.status, "PROVEN", `${row.slug} is currently not backed by accepted runtime evidence`);
  }
});
