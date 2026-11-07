import "server-only";

import { and, asc, eq, or, sql } from "drizzle-orm";

import type { TransactionsQuery } from "@/lib/api/transactions-query";
import type {
  TransactionDetail,
  TransactionListItem,
  TransactionListResponse,
} from "@/lib/api/types";
import type { Db } from "@/server/db/client";
import { accounts, categories, merchants, transactions } from "@/server/db/schema";

import { buildTransactionOrderBy, buildTransactionWhere } from "./transactions-sql";

const listColumns = {
  id: transactions.id,
  occurredAt: transactions.occurredAt,
  postedAt: transactions.postedAt,
  description: transactions.description,
  reference: transactions.reference,
  amountMinor: transactions.amountMinor,
  currency: transactions.currency,
  direction: transactions.direction,
  status: transactions.status,
  channel: transactions.channel,
  categorySlug: categories.slug,
  categoryKind: categories.kind,
  merchantId: merchants.id,
  merchantName: merchants.name,
  merchantCountry: merchants.country,
  accountId: accounts.id,
  accountName: accounts.name,
  accountType: accounts.type,
  transferGroupId: transactions.transferGroupId,
  refundOfId: transactions.refundOfId,
};

type Row = {
  [K in keyof typeof listColumns]: (typeof listColumns)[K]["_"]["data"] | null;
};

function toListItem(row: Row): TransactionListItem {
  return {
    id: row.id!,
    occurredAt: row.occurredAt!.toISOString(),
    postedAt: row.postedAt ? row.postedAt.toISOString() : null,
    description: row.description!,
    reference: row.reference!,
    amountMinor: row.amountMinor!,
    currency: row.currency!,
    direction: row.direction!,
    status: row.status!,
    channel: row.channel!,
    category: { slug: row.categorySlug!, kind: row.categoryKind! },
    merchant: row.merchantId ? { id: row.merchantId, name: row.merchantName! } : null,
    account: { id: row.accountId!, name: row.accountName!, type: row.accountType! },
  };
}

function baseSelect(db: Db) {
  return db
    .select(listColumns)
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(merchants, eq(merchants.id, transactions.merchantId));
}

export async function listTransactions(
  db: Db,
  userId: string,
  query: TransactionsQuery,
): Promise<TransactionListResponse> {
  const where = and(eq(accounts.userId, userId), buildTransactionWhere(query));

  const [rows, [countRow]] = await Promise.all([
    baseSelect(db)
      .where(where)
      .orderBy(...buildTransactionOrderBy(query))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .leftJoin(merchants, eq(merchants.id, transactions.merchantId))
      .where(where),
  ]);

  const total = countRow?.total ?? 0;
  return {
    data: rows.map(toListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** Upper bound for one export; the demo customer has about 12,000 rows. */
export const EXPORT_MAX_ROWS = 50_000;
const EXPORT_BATCH = 2_000;

/**
 * Every row matching the filters, in the requested order, fetched in batches so a large export
 * streams instead of being held in memory. Pagination params are ignored.
 */
export async function* exportTransactions(
  db: Db,
  userId: string,
  query: TransactionsQuery,
): AsyncGenerator<TransactionListItem[]> {
  const where = and(eq(accounts.userId, userId), buildTransactionWhere(query));
  for (let offset = 0; offset < EXPORT_MAX_ROWS; offset += EXPORT_BATCH) {
    const rows = await baseSelect(db)
      .where(where)
      .orderBy(...buildTransactionOrderBy(query))
      .limit(Math.min(EXPORT_BATCH, EXPORT_MAX_ROWS - offset))
      .offset(offset);
    if (rows.length > 0) yield rows.map(toListItem);
    if (rows.length < EXPORT_BATCH) return;
  }
}

export async function getTransaction(
  db: Db,
  userId: string,
  id: string,
): Promise<TransactionDetail | null> {
  const [row] = await baseSelect(db)
    .where(and(eq(transactions.id, id), eq(accounts.userId, userId)))
    .limit(1);
  if (!row) return null;

  const related = await baseSelect(db)
    .where(
      and(
        eq(accounts.userId, userId),
        or(
          row.refundOfId ? eq(transactions.id, row.refundOfId) : undefined,
          eq(transactions.refundOfId, row.id),
          row.transferGroupId
            ? and(
                eq(transactions.transferGroupId, row.transferGroupId),
                sql`${transactions.id} <> ${row.id}`,
              )
            : undefined,
        ),
      ),
    )
    .orderBy(asc(transactions.occurredAt));

  return {
    ...toListItem(row),
    merchant: row.merchantId
      ? { id: row.merchantId, name: row.merchantName!, country: row.merchantCountry! }
      : null,
    transferGroupId: row.transferGroupId,
    refundOf: (() => {
      const r = related.find((t) => t.id === row.refundOfId);
      return r ? toListItem(r) : null;
    })(),
    refunds: related.filter((t) => t.refundOfId === row.id).map(toListItem),
    counterpart: (() => {
      const c = related.find(
        (t) => row.transferGroupId && t.transferGroupId === row.transferGroupId,
      );
      return c ? toListItem(c) : null;
    })(),
  };
}
