import type { SummaryQuery } from "@/lib/api/summary-query";
import { addDays, addMonths, daysInRange, startOfMonth } from "@/lib/dates";

export interface ResolvedRange {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
}

/**
 * Default: the 12 calendar months ending on `anchorDay` (the latest month may be partial). The
 * previous range is the same number of days immediately before, for KPI comparisons.
 */
export function resolveSummaryRange(query: SummaryQuery, anchorDay: string): ResolvedRange {
  const to = query.to ?? anchorDay;
  const from = query.from ?? startOfMonth(addMonths(to, -11));
  const length = daysInRange(from, to);
  const previousTo = addDays(from, -1);
  return { from, to, previousFrom: addDays(previousTo, -(length - 1)), previousTo };
}
