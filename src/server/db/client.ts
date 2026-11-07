import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * One factory for the app (via ./index.ts) and Node scripts such as the seed. node-postgres works
 * with Neon and with a plain local Postgres; the app uses Neon's pooled URL, scripts the direct
 * one. See DECISIONS.md 003 and 006.
 */
export function createDb(databaseUrl: string, options: { max?: number } = {}) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: options.max ?? 5,
    // Serverless functions are frozen between requests; close idle connections quickly so a thawed
    // instance doesn't reuse sockets the server has already dropped.
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  // An idle client that loses its connection emits "error" on the pool; without a listener that
  // would crash the process. The next query simply opens a fresh connection.
  pool.on("error", (error) => console.error("Postgres pool error", error.message));
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;
