import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { migrationDatabaseUrl, parseServerEnv } from "./src/lib/env";

config({ path: ".env.local", quiet: true });
const env = parseServerEnv(process.env);

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations use the direct connection on Neon (see DECISIONS.md 006).
  dbCredentials: { url: migrationDatabaseUrl(env) },
  casing: "snake_case",
  strict: true,
});
