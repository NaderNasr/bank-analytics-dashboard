import { z } from "zod";

import {
  amountParam,
  enumParam,
  intParam,
  isoDay,
  multi,
  searchParam,
  searchParamsToObject,
} from "./params";
import { TRANSACTION_CHANNELS, TRANSACTION_DIRECTIONS, TRANSACTION_STATUSES } from "./types";

export const TRANSACTION_SORT_FIELDS = [
  "occurredAt",
  "amount",
  "description",
  "category",
  "status",
  "account",
] as const;
export type TransactionSortField = (typeof TRANSACTION_SORT_FIELDS)[number];

export const MAX_PAGE_SIZE = 200;

export const transactionsQuerySchema = z
  .object({
    page: intParam({ min: 1, max: 100_000, default: 1 }),
    pageSize: intParam({ min: 1, max: MAX_PAGE_SIZE, default: 50 }),
    sort: enumParam(TRANSACTION_SORT_FIELDS).default("occurredAt"),
    order: enumParam(["asc", "desc"]).default("desc"),
    /** Inclusive local days (Amman time). */
    from: isoDay,
    to: isoDay,
    account: multi(z.uuid({ message: "Not a valid account id" })),
    category: multi(z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/, "Not a valid category")),
    status: multi(z.enum(TRANSACTION_STATUSES)),
    channel: multi(z.enum(TRANSACTION_CHANNELS)),
    direction: enumParam(TRANSACTION_DIRECTIONS),
    /** Major units, compared against the absolute amount. */
    minAmount: amountParam,
    maxAmount: amountParam,
    q: searchParam,
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    path: ["to"],
    message: "`to` must be on or after `from`",
  })
  .refine(
    (v) => v.minAmount === undefined || v.maxAmount === undefined || v.minAmount <= v.maxAmount,
    {
      path: ["maxAmount"],
      message: "`maxAmount` must be at least `minAmount`",
    },
  );

export type TransactionsQuery = z.infer<typeof transactionsQuerySchema>;

export function parseTransactionsQuery(params: URLSearchParams) {
  return transactionsQuerySchema.safeParse(searchParamsToObject(params));
}
