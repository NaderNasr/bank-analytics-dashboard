import "server-only";

import { attachDatabasePool } from "@vercel/functions";

import { getServerEnv } from "@/server/env";

import { createDb, type Db } from "./client";

let instance: Db | undefined;

/** The app's database client, created on first use (see getServerEnv). */
export function getDb(): Db {
  if (!instance) {
    instance = createDb(getServerEnv().DATABASE_URL);
    // On Vercel Fluid compute, keeps the instance alive until idle connections close, so they are
    // not leaked when it suspends. A no-op everywhere else.
    attachDatabasePool(instance.$client);
  }
  return instance;
}

export * from "./schema";
