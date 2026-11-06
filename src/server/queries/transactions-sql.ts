/**
 * Pure SQL builders for the transactions explorer: query params in, Drizzle SQL out. No database
 * access and no `server-only`, so they can be unit-tested by rendering the SQL.
 */
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";

import type { TransactionSortField, TransactionsQuery } from "@/lib/api/transactions-query";
import { addDays, localDayStart } from "@/lib/dates";
import { accounts, categories, merchants, transactions } from "@/server/db/schema";

/** Escapes LIKE wildcards so user input is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

type Filters = Omit<TransactionsQuery, "page" | "pageSize" | "sort" | "order">;

export function buildTransactionWhere(query: Partial<Filters>): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];

  if (query.from) conditions.push(gte(transactions.occurredAt, localDayStart(query.from)));
  // `to` is inclusive: everything before the start of the following local day.
  if (query.to) conditions.push(lt(transactions.occurredAt, localDayStart(addDays(query.to, 1))));

  if (query.account?.length) conditions.push(inArray(transactions.accountId, query.account));
  if (query.category?.length) conditions.push(inArray(categories.slug, query.category));
  if (query.status?.length) conditions.push(inArray(transactions.status, query.status));
  if (query.channel?.length) conditions.push(inArray(transactions.channel, query.channel));
  if (query.direction) conditions.push(eq(transactions.direction, query.direction));

  if (query.minAmount !== undefined) {
    conditions.push(gte(transactions.amountMinor, query.minAmount));
  }
  if (query.maxAmount !== undefined) {
    conditions.push(lte(transactions.amountMinor, query.maxAmount));
  }

  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    conditions.push(
      or(
        sql`${transactions.description} ILIKE ${pattern}`,
        sql`${merchants.name} ILIKE ${pattern}`,
        sql`${transactions.reference} ILIKE ${pattern}`,
      ),
    );
  }

  return conditions.length ? and(...conditions) : undefined;
}

const SORT_COLUMNS: Record<TransactionSortField, AnyColumn> = {
  occurredAt: transactions.occurredAt,
  amount: transactions.amountMinor,
  description: transactions.description,
  category: categories.slug,
  status: transactions.status,
  account: accounts.name,
};

/** Primary sort, then newest first, then id, so pages are stable when values tie. */
export function buildTransactionOrderBy(query: Pick<TransactionsQuery, "sort" | "order">): SQL[] {
  const direction = query.order === "asc" ? asc : desc;
  const order = [direction(SORT_COLUMNS[query.sort])];
  if (query.sort !== "occurredAt") order.push(desc(transactions.occurredAt));
  order.push(direction(transactions.id));
  return order;
}
