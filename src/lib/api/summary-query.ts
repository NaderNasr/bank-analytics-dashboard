import { z } from "zod";

import { isoDay, multi, searchParamsToObject } from "./params";

export const summaryQuerySchema = z
  .object({
    /** Inclusive local days. Defaults to the 12 months ending on the latest transaction. */
    from: isoDay,
    to: isoDay,
    account: multi(z.uuid({ message: "Not a valid account id" })),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    path: ["to"],
    message: "`to` must be on or after `from`",
  })
  .refine(
    (v) => !v.from || !v.to || Date.parse(v.to) - Date.parse(v.from) <= 3 * 366 * 86_400_000,
    { path: ["from"], message: "The range can be at most 3 years" },
  );

export type SummaryQuery = z.infer<typeof summaryQuerySchema>;

export function parseSummaryQuery(params: URLSearchParams) {
  return summaryQuerySchema.safeParse(searchParamsToObject(params));
}
