import "server-only";

import { and, eq, gte, inArray, lt, sql, type SQL } from "drizzle-orm";

import type { SummaryQuery } from "@/lib/api/summary-query";
import type { InsightsResponse } from "@/lib/api/types";
import { APP_TIME_ZONE } from "@/lib/constants";
import { addDays, daysInRange, localDayStart, weekendDaysBetween } from "@/lib/dates";
import { buildSavingsReport, type SpendingStats } from "@/lib/insights";
import type { Db } from "@/server/db/client";
import { accounts, categories, merchants, transactions } from "@/server/db/schema";

import { activityBounds } from "./summary";
import { resolveSummaryRange } from "./summary-range";

const TZ = sql.raw(`'${APP_TIME_ZONE}'`);
const money = (expr: SQL) => sql<number>`coalesce(${expr}, 0)::bigint`.mapWith(Number);
const count = (expr: SQL) => sql<number>`${expr}`.mapWith(Number);

const isSpend = sql`${transactions.status} = 'posted' AND ${transactions.direction} = 'debit' AND ${categories.kind} = 'expense'`;
const inCategory = (slug: string) => sql`${isSpend} AND ${categories.slug} = ${slug}`;
const online = sql`${transactions.channel} = 'online'`;
/**
 * Weekend spending a weekend budget can change: shopping, entertainment and eating out in person.
 * Coffee, delivery and rides are left out because they have their own suggestions, so the
 * savings never count the same money twice.
 */
const WEEKEND_CATEGORIES = ["shopping", "entertainment"];

/**
 * Savings suggestions for the same window as the overview (`months` ending on the latest
 * transaction). SQL gathers the statistics; the rules in `@/lib/insights` turn them into advice.
 */
export async function getInsights(
  db: Db,
  userId: string,
  query: SummaryQuery,
): Promise<InsightsResponse> {
  const bounds = await activityBounds(db, userId);
  const range = resolveSummaryRange(query, query.to ?? bounds.latest);
  // Don't count days before the history started as "no spending".
  const from = range.from < bounds.first ? bounds.first : range.from;
  const where = and(
    eq(accounts.userId, userId),
    gte(transactions.occurredAt, localDayStart(from)),
    lt(transactions.occurredAt, localDayStart(addDays(range.to, 1))),
    query.account?.length ? inArray(transactions.accountId, query.account) : undefined,
  );

  const weekday = sql<number>`extract(isodow from ${transactions.occurredAt} AT TIME ZONE ${TZ})`;
  const isWeekend = sql`${weekday} IN (5, 6)`;
  const isDiscretionary = sql`${isSpend} AND (${inArray(categories.slug, WEEKEND_CATEGORIES)} OR (${categories.slug} = 'dining' AND NOT ${online}))`;

  const [[totals], subscriptions] = await Promise.all([
    db
      .select({
        coffeeMinor: money(
          sql`sum(${transactions.amountMinor}) FILTER (WHERE ${inCategory("coffee")})`,
        ),
        coffeeCount: count(sql`count(*) FILTER (WHERE ${inCategory("coffee")})`),
        deliveryMinor: money(
          sql`sum(${transactions.amountMinor}) FILTER (WHERE ${inCategory("dining")} AND ${online})`,
        ),
        deliveryCount: count(sql`count(*) FILTER (WHERE ${inCategory("dining")} AND ${online})`),
        ridesMinor: money(
          sql`sum(${transactions.amountMinor}) FILTER (WHERE ${inCategory("transport")} AND ${online})`,
        ),
        ridesCount: count(sql`count(*) FILTER (WHERE ${inCategory("transport")} AND ${online})`),
        foreignMinor: money(
          sql`sum(${transactions.amountMinor}) FILTER (WHERE ${inCategory("fees")} AND ${transactions.description} LIKE 'FOREIGN TRANSACTION FEE%')`,
        ),
        foreignCount: count(
          sql`count(*) FILTER (WHERE ${inCategory("fees")} AND ${transactions.description} LIKE 'FOREIGN TRANSACTION FEE%')`,
        ),
        atmMinor: money(
          sql`sum(${transactions.amountMinor}) FILTER (WHERE ${inCategory("fees")} AND ${transactions.description} LIKE 'ATM FEE%')`,
        ),
        atmCount: count(
          sql`count(*) FILTER (WHERE ${inCategory("fees")} AND ${transactions.description} LIKE 'ATM FEE%')`,
        ),
        weekendMinor: money(
          sql`sum(${transactions.amountMinor}) FILTER (WHERE ${isDiscretionary} AND ${isWeekend})`,
        ),
        weekdayMinor: money(
          sql`sum(${transactions.amountMinor}) FILTER (WHERE ${isDiscretionary} AND NOT ${isWeekend})`,
        ),
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where),
    db
      .select({
        merchant: merchants.name,
        averageMinor: sql<number>`round(avg(${transactions.amountMinor}))::bigint`.mapWith(Number),
        charges: count(sql`count(*)`),
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .innerJoin(merchants, eq(merchants.id, transactions.merchantId))
      .where(and(where, inCategory("subscriptions")))
      .groupBy(merchants.name),
  ]);

  const days = daysInRange(from, range.to);
  const weekendDays = weekendDaysBetween(from, range.to);
  const stats: SpendingStats = {
    days,
    subscriptions,
    coffee: { totalMinor: totals?.coffeeMinor ?? 0, count: totals?.coffeeCount ?? 0 },
    delivery: { totalMinor: totals?.deliveryMinor ?? 0, count: totals?.deliveryCount ?? 0 },
    rides: { totalMinor: totals?.ridesMinor ?? 0, count: totals?.ridesCount ?? 0 },
    fees: {
      foreignMinor: totals?.foreignMinor ?? 0,
      foreignCount: totals?.foreignCount ?? 0,
      atmMinor: totals?.atmMinor ?? 0,
      atmCount: totals?.atmCount ?? 0,
    },
    weekend: {
      weekendMinor: totals?.weekendMinor ?? 0,
      weekendDays,
      weekdayMinor: totals?.weekdayMinor ?? 0,
      weekdayDays: days - weekendDays,
    },
  };

  return { range: { from, to: range.to }, ...buildSavingsReport(stats) };
}
