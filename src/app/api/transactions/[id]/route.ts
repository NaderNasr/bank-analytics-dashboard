import { z } from "zod";

import type { TransactionDetailResponse } from "@/lib/api/types";
import { getDb } from "@/server/db";
import { errorResponse, json, withUser } from "@/server/http";
import { getTransaction } from "@/server/queries/transactions";

/** GET /api/transactions/:id — one transaction with its refund, refunds or transfer counterpart. */
export async function GET(_request: Request, ctx: RouteContext<"/api/transactions/[id]">) {
  const { id } = await ctx.params;
  const notFound = () => errorResponse(404, "not_found", "Transaction not found.");
  if (!z.uuid().safeParse(id).success) return notFound();

  return withUser(async (userId) => {
    const transaction = await getTransaction(getDb(), userId, id);
    return transaction ? json<TransactionDetailResponse>({ data: transaction }) : notFound();
  });
}
