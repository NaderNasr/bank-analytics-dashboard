import type { AccountsResponse } from "@/lib/api/types";
import { getDb } from "@/server/db";
import { json, withUser } from "@/server/http";
import { listAccounts } from "@/server/queries/accounts";

/** GET /api/accounts — the user's accounts with derived balances. */
export async function GET() {
  return withUser(async (userId) =>
    json<AccountsResponse>({ data: await listAccounts(getDb(), userId) }),
  );
}
