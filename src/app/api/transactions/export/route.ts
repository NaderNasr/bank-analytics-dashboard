import type { NextRequest } from "next/server";

import { parseTransactionsQuery } from "@/lib/api/transactions-query";
import { csvRow } from "@/lib/csv";
import { localDateTime } from "@/lib/dates";
import { toMajor } from "@/lib/money";
import { getDb } from "@/server/db";
import { errorResponse, invalidQuery, unauthorized } from "@/server/http";
import { getSessionUserId } from "@/server/auth";
import { exportTransactions } from "@/server/queries/transactions";

const HEADER = [
  "Date (Asia/Amman)",
  "Description",
  "Merchant",
  "Category",
  "Account",
  "Direction",
  "Status",
  "Channel",
  "Amount",
  "Currency",
  "Reference",
];

/**
 * GET /api/transactions/export — the same filters and sort as /api/transactions, as a CSV
 * download of every matching row (pagination ignored). Streams in batches. Amounts are signed
 * major units (money out is negative) so the file sums correctly in a spreadsheet.
 */
export async function GET(request: NextRequest) {
  const parsed = parseTransactionsQuery(request.nextUrl.searchParams);
  if (!parsed.success) return invalidQuery(parsed.error);

  let userId: string | null;
  try {
    userId = await getSessionUserId();
  } catch (error) {
    console.error(error);
    return errorResponse(500, "internal_error", "Something went wrong. Please try again.");
  }
  if (!userId) return unauthorized();

  const rows = exportTransactions(getDb(), userId, parsed.data);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // BOM so Excel opens UTF-8 (Arabic merchant names, if any) correctly.
        controller.enqueue(encoder.encode(`﻿${csvRow(HEADER)}`));
        for await (const batch of rows) {
          const chunk = batch
            .map((t) =>
              csvRow([
                localDateTime(new Date(t.occurredAt)),
                t.description,
                t.merchant?.name ?? "",
                t.category.slug,
                t.account.name,
                t.direction,
                t.status,
                t.channel,
                (t.direction === "debit" ? -1 : 1) * toMajor(t.amountMinor, t.currency),
                t.currency,
                t.reference,
              ]),
            )
            .join("");
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        console.error(error);
        controller.error(error);
      }
    },
  });

  const day = new Date().toISOString().slice(0, 10);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${day}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
