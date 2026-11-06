import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { parseServerEnv } from "./src/lib/env";

config({ path: ".env.local" });
const env = parseServerEnv(process.env);

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL },
  casing: "snake_case",
  strict: true,
});
