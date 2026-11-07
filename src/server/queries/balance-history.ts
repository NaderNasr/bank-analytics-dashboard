import { addDays, daysInRange } from "@/lib/dates";

/**
 * End-of-day total balance for every day in [from, to], derived backwards from today's balance:
 * the balance at the end of day d is the current total minus everything that moved after d.
 * Pure, so the arithmetic is tested without a database.
 */
export function balanceHistory(
  currentTotalMinor: number,
  dailyNet: readonly { date: string; netMinor: number }[],
  from: string,
  to: string,
): { date: string; totalMinor: number }[] {
  const days = daysInRange(from, to);
  const netByDay = new Map(dailyNet.map((d) => [d.date, d.netMinor]));
  const afterRange = dailyNet.filter((d) => d.date > to).reduce((sum, d) => sum + d.netMinor, 0);

  const out: { date: string; totalMinor: number }[] = new Array(days);
  let balance = currentTotalMinor - afterRange;
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(from, i);
    out[i] = { date, totalMinor: balance };
    balance -= netByDay.get(date) ?? 0;
  }
  return out;
}
