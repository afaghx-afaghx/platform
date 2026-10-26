import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createPlatformRuntime } from "../runtime/composition.mjs";

const require = createRequire(new URL("../../core/AFX-CORE/package.json", import.meta.url));
const { Pool } = require("pg");

export function loadRuntimeConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  const port = Number(env.PORT || 8080);
  const host = env.HOST || "0.0.0.0";
  const databaseUrl = String(env.DATABASE_URL || "").trim();
  const allowedOrigins = String(env.AFAGHX_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("invalid_port");
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (nodeEnv === "production") {
    if (env.DATABASE_SSL !== "true") throw new Error("production_database_ssl_required");
    if (allowedOrigins.length === 0) throw new Error("production_allowed_origins_required");
  }

  return Object.freeze({
    nodeEnv,
    port,
    host,
    databaseUrl,
    databaseSsl: env.DATABASE_SSL === "true",
    allowedOrigins
  });
}

export async function createProductionServer({ env = process.env } = {}) {
  const config = loadRuntimeConfig(env);
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: Number(env.DATABASE_POOL_MAX || 20),
    ssl: config.databaseSsl
      ? { rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined
  });

  const runtime = createPlatformRuntime({ pool, allowedOrigins: config.allowedOrigins });
  await runtime.core.migrate();
  const server = runtime.createServer();

  const shutdown = async (signal) => {
    server.close(async () => {
      await pool.end();
      process.exit(signal === "SIGINT" ? 130 : 143);
    });
  };

  server.on("error", async () => {
    await pool.end().catch(() => {});
    process.exit(1);
  });

  return Object.freeze({ server, pool, config, shutdown });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { server, config, shutdown } = await createProductionServer();
  server.listen(config.port, config.host, () => {
    console.log(JSON.stringify({
      status: "listening",
      service: "afaghx-api-gateway",
      runtime: "Gateway -> PersistentAfxCore -> PostgreSQL",
      host: config.host,
      port: config.port,
      environment: config.nodeEnv
    }));
  });
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
