import "server-only";

import { eq } from "drizzle-orm";

import { DEMO_USER_EMAIL } from "@/lib/constants";
import { getDb, users } from "@/server/db";

let demoUserId: Promise<string | null> | undefined;

/**
 * The user the API acts for. Until authentication lands (Phase 2) this is the seeded demo
 * customer; afterwards it comes from the session. Returns null when no user is found.
 */
export async function getCurrentUserId(): Promise<string | null> {
  demoUserId ??= getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_USER_EMAIL))
    .limit(1)
    .then(([row]) => row?.id ?? null)
    .catch((error: unknown) => {
      demoUserId = undefined; // retry on the next request
      throw error;
    });
  return demoUserId;
}
