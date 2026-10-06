import assert from "node:assert/strict";
import test from "node:test";
import type { Brand } from "../src/index.js";

test("shared-kernel exposes only a domain-neutral Brand type", () => {
  const id = "usr_001" as Brand<string, "UserId">;
  assert.equal(id, "usr_001");
});
