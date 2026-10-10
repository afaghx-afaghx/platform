import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const gatewayPath = new URL("./runtime.mjs", import.meta.url);
const compositionPath = new URL("../runtime/composition.mjs", import.meta.url);

test("AFX-ARCH-004: Gateway is not a domain composition root", async () => {
  const source = await readFile(gatewayPath, "utf8");
  assert.doesNotMatch(source, /from ['"][^'"]*\/domains\//, "Gateway must not import domain implementations");
  assert.doesNotMatch(source, /createPostgresDomainAdapter|createProductQuery/, "Gateway must not construct domain adapters or queries");
});

test("AFX-ARCH-004: Platform composition root owns domain wiring", async () => {
  const source = await readFile(compositionPath, "utf8");
  assert.match(source, /createPostgresDomainAdapter/);
  assert.match(source, /createProductQuery/);
  assert.match(source, /createCanonicalRuntime/);
  assert.match(source, /productQuery/);
});
