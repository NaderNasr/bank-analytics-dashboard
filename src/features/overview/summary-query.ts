import { queryOptions } from "@tanstack/react-query";

import { getJson } from "@/components/providers/query-provider";
import type { SummaryResponse } from "@/lib/api/types";

export const RANGE_OPTIONS = [3, 6, 12] as const;
export type RangeMonths = (typeof RANGE_OPTIONS)[number];

export function summaryQuery(months: RangeMonths) {
  return queryOptions({
    queryKey: ["summary", { months }],
    queryFn: ({ signal }) => getJson<SummaryResponse>(`/api/summary?months=${months}`, signal),
  });
}
