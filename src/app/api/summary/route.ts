import type { NextRequest } from "next/server";

import { parseSummaryQuery } from "@/lib/api/summary-query";
import type { SummaryResponse } from "@/lib/api/types";
import { getDb } from "@/server/db";
import { invalidQuery, json, withUser } from "@/server/http";
import { getSummary } from "@/server/queries/summary";

/**
 * GET /api/summary
 * from, to (YYYY-MM-DD; default: the 12 months ending on the latest transaction), account.
 * KPIs with the previous period for comparison, balances, monthly cash flow, spending by
 * category, daily spending and top merchants.
 */
export async function GET(request: NextRequest) {
  const parsed = parseSummaryQuery(request.nextUrl.searchParams);
  if (!parsed.success) return invalidQuery(parsed.error);
  return withUser(async (userId) =>
    json<SummaryResponse>(await getSummary(getDb(), userId, parsed.data)),
  );
}
