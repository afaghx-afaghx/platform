import test from "node:test";
import assert from "node:assert/strict";
import { loadRuntimeConfig } from "./server.mjs";

test("production runtime rejects missing DATABASE_SSL", () => {
  assert.throws(
    () => loadRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://example",
      AFAGHX_ALLOWED_ORIGINS: "https://www.afaghx.com"
    }),
    /production_database_ssl_required/
  );
});

test("production runtime rejects empty CORS origin policy", () => {
  assert.throws(
    () => loadRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://example",
      DATABASE_SSL: "true",
      AFAGHX_ALLOWED_ORIGINS: ""
    }),
    /production_allowed_origins_required/
  );
});

test("production runtime accepts an explicit secure configuration", () => {
  const cfg = loadRuntimeConfig({
    NODE_ENV: "production",
    PORT: "8080",
    HOST: "0.0.0.0",
    DATABASE_URL: "postgresql://example",
    DATABASE_SSL: "true",
    AFAGHX_ALLOWED_ORIGINS: "https://www.afaghx.com,https://buyer.afaghx.com"
  });
  assert.deepEqual(cfg, {
    nodeEnv: "production",
    port: 8080,
    host: "0.0.0.0",
    databaseUrl: "postgresql://example",
    databaseSsl: true,
    allowedOrigins: ["https://www.afaghx.com", "https://buyer.afaghx.com"]
  });
});
