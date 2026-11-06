import { z } from "zod";

import { DEMO_USER_EMAIL } from "@/lib/constants";

function formatIssues(error: z.ZodError) {
  return error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
}

/**
 * Server environment. A missing or malformed variable fails fast with a readable message instead
 * of surfacing later as a confusing runtime error.
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
  if (!result.success)
    throw new Error(`Invalid environment variables:\n${formatIssues(result.error)}`);
  return result.data;
}

/**
 * Authentication environment, kept apart from the database one so the seed and migrations do not
 * need auth secrets. The demo credentials are deliberately public (the sign-in page shows them);
 * they live in env so a deployment can rotate the password without a code change.
 */
const authEnvSchema = z.object({
  AUTH_SECRET: z
    .string({ message: "AUTH_SECRET is required (generate one with `npx auth secret`)" })
    .min(32, "AUTH_SECRET must be at least 32 characters"),
  DEMO_USER_EMAIL: z
    .email({ message: "DEMO_USER_EMAIL must be an email address" })
    .default(DEMO_USER_EMAIL),
  DEMO_USER_PASSWORD: z
    .string({ message: "DEMO_USER_PASSWORD is required" })
    .min(8, "DEMO_USER_PASSWORD must be at least 8 characters"),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function parseAuthEnv(source: Record<string, string | undefined>): AuthEnv {
  const result = authEnvSchema.safeParse(source);
  if (!result.success)
    throw new Error(`Invalid environment variables:\n${formatIssues(result.error)}`);
  return result.data;
}
