import type { NextRequest } from "next/server";

import { parseTransactionsQuery } from "@/lib/api/transactions-query";
import type { TransactionListResponse } from "@/lib/api/types";
import { getDb } from "@/server/db";
import { invalidQuery, json, withUser } from "@/server/http";
import { listTransactions } from "@/server/queries/transactions";

/**
 * GET /api/transactions
 * page, pageSize (≤200), sort (occurredAt|amount|description|category|status|account),
 * order (asc|desc), from, to (YYYY-MM-DD, inclusive, Amman time), account, category, status,
 * channel (repeatable or comma-separated), direction, minAmount, maxAmount (JOD), q (search).
 */
export async function GET(request: NextRequest) {
  const parsed = parseTransactionsQuery(request.nextUrl.searchParams);
  if (!parsed.success) return invalidQuery(parsed.error);
  return withUser(async (userId) =>
    json<TransactionListResponse>(await listTransactions(getDb(), userId, parsed.data)),
  );
}
