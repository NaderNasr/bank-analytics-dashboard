import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import type { AccountSummary } from "@/lib/api/types";
import type { Db } from "@/server/db/client";
import { accounts, transactions } from "@/server/db/schema";

/** Signed posted amount: credits add, debits subtract. Only posted rows move the balance. */
export const postedSigned = sql`CASE WHEN ${transactions.status} <> 'posted' THEN 0
  WHEN ${transactions.direction} = 'credit' THEN ${transactions.amountMinor}
  ELSE -${transactions.amountMinor} END`;

const TYPE_ORDER = sql`CASE ${accounts.type} WHEN 'current' THEN 0 WHEN 'savings' THEN 1 ELSE 2 END`;

export async function listAccounts(db: Db, userId: string): Promise<AccountSummary[]> {
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      maskedNumber: accounts.maskedNumber,
      currency: accounts.currency,
      creditLimitMinor: accounts.creditLimitMinor,
      balanceMinor:
        sql<number>`(${accounts.openingBalanceMinor} + coalesce(sum(${postedSigned}), 0))::bigint`.mapWith(
          Number,
        ),
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(and(eq(accounts.userId, userId)))
    .groupBy(accounts.id)
    .orderBy(TYPE_ORDER, asc(accounts.name));

  return rows.map((r) => ({
    ...r,
    availableMinor: r.type === "card" ? (r.creditLimitMinor ?? 0) + r.balanceMinor : r.balanceMinor,
  }));
}
