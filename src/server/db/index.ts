import "server-only";

import { getServerEnv } from "@/server/env";

import { createDb, type Db } from "./client";

let instance: Db | undefined;

/** The app's database client, created on first use (see getServerEnv). */
export function getDb(): Db {
  instance ??= createDb(getServerEnv().DATABASE_URL);
  return instance;
}

export * from "./schema";
