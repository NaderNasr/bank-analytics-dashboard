import type { NextRequest } from "next/server";

import { parseSummaryQuery } from "@/lib/api/summary-query";
import type { InsightsResponse } from "@/lib/api/types";
import { getDb } from "@/server/db";
import { invalidQuery, json, withUser } from "@/server/http";
import { getInsights } from "@/server/queries/insights";

/**
 * GET /api/insights
 * months (1–36, default 12), from, to, account: the same window as /api/summary.
 * Savings suggestions with the evidence behind each one and an estimated monthly saving.
 */
export async function GET(request: NextRequest) {
  const parsed = parseSummaryQuery(request.nextUrl.searchParams);
  if (!parsed.success) return invalidQuery(parsed.error);
  return withUser(async (userId) =>
    json<InsightsResponse>(await getInsights(getDb(), userId, parsed.data)),
  );
}
