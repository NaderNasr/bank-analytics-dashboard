import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * One factory for the app (via ./index.ts) and Node scripts such as the seed. node-postgres works
 * with Neon and with a plain local Postgres; the app uses Neon's pooled URL, scripts the direct
 * one. See DECISIONS.md 003 and 006.
 */
export function createDb(databaseUrl: string, options: { max?: number } = {}) {
  const pool = new Pool({ connectionString: databaseUrl, max: options.max ?? 5 });
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;
