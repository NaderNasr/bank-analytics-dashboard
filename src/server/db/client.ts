import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/** Shared by the app (via ./index.ts) and Node scripts such as the seed. */
export function createDb(databaseUrl: string) {
  return drizzle({ client: neon(databaseUrl), schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;
