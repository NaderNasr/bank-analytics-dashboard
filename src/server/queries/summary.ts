import "server-only";

import { and, desc, eq, gte, inArray, lt, sql, type SQL } from "drizzle-orm";

import type { SummaryQuery } from "@/lib/api/summary-query";
import type { Kpis, SummaryResponse } from "@/lib/api/types";
import { APP_CURRENCY, APP_TIME_ZONE } from "@/lib/constants";
import { addDays, daysInRange, localDay, localDayStart, monthsInRange } from "@/lib/dates";
import type { Db } from "@/server/db/client";
import { accounts, categories, merchants, transactions } from "@/server/db/schema";

import { listAccounts, postedSigned } from "./accounts";
import { balanceHistory } from "./balance-history";
import { resolveSummaryRange } from "./summary-range";

// A literal, not a bind parameter: GROUP BY must see the same expression as SELECT. Constant, so safe.
const TZ = sql.raw(`'${APP_TIME_ZONE}'`);

const money = (expr: SQL) => sql<number>`coalesce(${expr}, 0)::bigint`.mapWith(Number);
const count = (expr: SQL) => sql<number>`${expr}`.mapWith(Number);

const isPosted = sql`${transactions.status} = 'posted'`;
const isIncome = sql`${isPosted} AND ${transactions.direction} = 'credit' AND ${categories.kind} = 'income' AND ${categories.slug} <> 'refunds'`;
const isExpense = sql`${isPosted} AND ${transactions.direction} = 'debit' AND ${categories.kind} = 'expense'`;
const isRefund = sql`${isPosted} AND ${categories.slug} = 'refunds'`;

function scope(userId: string, from: string, to: string, accountIds?: string[]) {
  return and(
    eq(accounts.userId, userId),
    gte(transactions.occurredAt, localDayStart(from)),
    lt(transactions.occurredAt, localDayStart(addDays(to, 1))),
    accountIds?.length ? inArray(transactions.accountId, accountIds) : undefined,
  );
}

async function kpis(
  db: Db,
  userId: string,
  from: string,
  to: string,
  accountIds?: string[],
): Promise<Kpis> {
  const [row] = await db
    .select({
      income: money(sql`sum(${transactions.amountMinor}) FILTER (WHERE ${isIncome})`),
      expense: money(sql`sum(${transactions.amountMinor}) FILTER (WHERE ${isExpense})`),
      refunds: money(sql`sum(${transactions.amountMinor}) FILTER (WHERE ${isRefund})`),
      total: count(sql`count(*)`),
      failed: count(sql`count(*) FILTER (WHERE ${transactions.status} = 'failed')`),
      pending: count(sql`count(*) FILTER (WHERE ${transactions.status} = 'pending')`),
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(scope(userId, from, to, accountIds));

  const income = row?.income ?? 0;
  const spending = (row?.expense ?? 0) - (row?.refunds ?? 0);
  const net = income - spending;
  return {
    incomeMinor: income,
    spendingMinor: spending,
    netMinor: net,
    savingsRate: income > 0 ? net / income : null,
    transactionCount: row?.total ?? 0,
    averageDailySpendingMinor: Math.round(spending / daysInRange(from, to)),
    failedCount: row?.failed ?? 0,
    pendingCount: row?.pending ?? 0,
  };
}

/**
 * The local days of the user's first and latest transactions (today if there are none). Anchoring
 * the default range to the data (not the clock) keeps a seeded demo meaningful long after seeding.
 */
export async function activityBounds(
  db: Db,
  userId: string,
): Promise<{ first: string; latest: string }> {
  const [row] = await db
    .select({
      first: sql<Date | null>`min(${transactions.occurredAt})`,
      latest: sql<Date | null>`max(${transactions.occurredAt})`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(eq(accounts.userId, userId));
  const today = localDay(new Date());
  return {
    first: row?.first ? localDay(new Date(row.first)) : today,
    latest: row?.latest ? localDay(new Date(row.latest)) : today,
  };
}

export async function getSummary(
  db: Db,
  userId: string,
  query: SummaryQuery,
): Promise<SummaryResponse> {
  const bounds = await activityBounds(db, userId);
  const range = resolveSummaryRange(query, query.to ?? bounds.latest);
  // A previous period that starts before the history does compares against a partly empty window
  // ("+106% income"), so there is no comparison in that case.
  const comparable = range.previousFrom >= bounds.first;
  const where = scope(userId, range.from, range.to, query.account);
  const month = sql<string>`to_char(${transactions.occurredAt} AT TIME ZONE ${TZ}, 'YYYY-MM')`;
  const day = sql<string>`to_char(${transactions.occurredAt} AT TIME ZONE ${TZ}, 'YYYY-MM-DD')`;

  const [allAccounts, current, previous, monthly, byCategory, daily, topMerchants, dailyNet] =
    await Promise.all([
      listAccounts(db, userId),
      kpis(db, userId, range.from, range.to, query.account),
      comparable ? kpis(db, userId, range.previousFrom, range.previousTo, query.account) : null,
      db
        .select({
          month,
          income: money(sql`sum(${transactions.amountMinor}) FILTER (WHERE ${isIncome})`),
          expense: money(sql`sum(${transactions.amountMinor}) FILTER (WHERE ${isExpense})`),
          refunds: money(sql`sum(${transactions.amountMinor}) FILTER (WHERE ${isRefund})`),
        })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .innerJoin(categories, eq(categories.id, transactions.categoryId))
        .where(where)
        .groupBy(month),
      db
        .select({
          slug: categories.slug,
          amount: money(sql`sum(${transactions.amountMinor})`),
          count: count(sql`count(*)`),
        })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .innerJoin(categories, eq(categories.id, transactions.categoryId))
        .where(and(where, isExpense))
        .groupBy(categories.slug)
        .orderBy(desc(sql`2`)),
      db
        .select({
          date: day,
          amount: money(sql`sum(${transactions.amountMinor})`),
          count: count(sql`count(*)`),
        })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .innerJoin(categories, eq(categories.id, transactions.categoryId))
        .where(and(where, isExpense))
        .groupBy(day)
        .orderBy(day),
      db
        .select({
          id: merchants.id,
          name: merchants.name,
          amount: money(sql`sum(${transactions.amountMinor})`),
          count: count(sql`count(*)`),
        })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .innerJoin(categories, eq(categories.id, transactions.categoryId))
        .innerJoin(merchants, eq(merchants.id, transactions.merchantId))
        .where(and(where, isExpense))
        .groupBy(merchants.id)
        .orderBy(desc(sql`3`))
        .limit(5),
      // Net balance movement per day from the start of the range onwards (including after it),
      // to rebuild end-of-day balances backwards from today's total.
      db
        .select({ date: day, net: money(sql`sum(${postedSigned})`) })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .where(
          and(
            eq(accounts.userId, userId),
            gte(transactions.occurredAt, localDayStart(range.from)),
            query.account?.length ? inArray(transactions.accountId, query.account) : undefined,
          ),
        )
        .groupBy(day),
    ]);

  const monthlyByKey = new Map(monthly.map((m) => [m.month, m]));
  const categoryTotal = byCategory.reduce((sum, c) => sum + c.amount, 0);
  const accountsInScope = query.account?.length
    ? allAccounts.filter((a) => query.account!.includes(a.id))
    : allAccounts;

  const totalMinor = accountsInScope.reduce((sum, a) => sum + a.balanceMinor, 0);

  return {
    currency: APP_CURRENCY,
    range: { from: range.from, to: range.to },
    previousRange: { from: range.previousFrom, to: range.previousTo },
    balances: {
      // Card balances are negative (money owed), so this is net worth across the accounts.
      totalMinor,
      accounts: accountsInScope,
    },
    balanceHistory: balanceHistory(
      totalMinor,
      dailyNet.map((d) => ({ date: d.date, netMinor: d.net })),
      range.from,
      range.to,
    ),
    kpis: current,
    previousKpis: previous,
    cashFlow: monthsInRange(range.from, range.to).map((m) => {
      const row = monthlyByKey.get(m);
      return {
        month: m,
        incomeMinor: row?.income ?? 0,
        spendingMinor: (row?.expense ?? 0) - (row?.refunds ?? 0),
      };
    }),
    spendingByCategory: byCategory.map((c) => ({
      slug: c.slug,
      amountMinor: c.amount,
      count: c.count,
      share: categoryTotal > 0 ? c.amount / categoryTotal : 0,
    })),
    dailySpending: daily.map((d) => ({ date: d.date, amountMinor: d.amount, count: d.count })),
    topMerchants: topMerchants.map((m) => ({
      id: m.id,
      name: m.name,
      amountMinor: m.amount,
      count: m.count,
    })),
  };
}
