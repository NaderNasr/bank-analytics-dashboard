import { z } from "zod";

/**
 * Server environment, validated once at import time. A missing or malformed variable fails fast
 * with a readable message instead of surfacing later as a confusing runtime error.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .url({ message: "DATABASE_URL must be a Postgres connection URL" })
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "DATABASE_URL must start with postgres://"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  return result.data;
}
