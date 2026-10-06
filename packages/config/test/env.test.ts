import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCoreEnv } from "../src/env.js";

test("environment parser defaults NODE_ENV", () => {
  assert.equal(parseCoreEnv({}).NODE_ENV, "development");
});

test("environment parser accepts valid optional infrastructure URLs", () => {
  const env = parseCoreEnv({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://localhost:5432/afaghx",
    REDIS_URL: "redis://localhost:6379",
    API_BASE_URL: "https://api.afaghx.com",
  });
  assert.equal(env.NODE_ENV, "test");
  assert.equal(env.DATABASE_URL, "postgresql://localhost:5432/afaghx");
  assert.equal(env.API_BASE_URL, "https://api.afaghx.com");
});

test("environment parser rejects invalid NODE_ENV", () => {
  assert.throws(() => parseCoreEnv({ NODE_ENV: "invalid" }));
});
