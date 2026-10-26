import { z } from "zod";

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const coreEnvSchema = baseEnvSchema.extend({
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  API_BASE_URL: z.string().url().optional(),
});

export type CoreEnv = z.infer<typeof coreEnvSchema>;

export function parseCoreEnv(input: Record<string, unknown>): CoreEnv {
  return coreEnvSchema.parse(input);
}
