import "server-only";

import { env } from "@/server/env";

import { createDb } from "./client";

export const db = createDb(env.DATABASE_URL);
export * from "./schema";
