import { max, rollup, sum } from "d3-array";
import { scaleQuantile } from "d3-scale";
import { utcDay, utcMonth, utcSunday } from "d3-time";

/**
 * Pure layout for the calendar heatmap, built on D3: `d3-time` intervals place every day in a
 * Sunday-first week column (the Jordanian working week), `d3-array` aggregates, and a
 * `d3-scale` quantile scale buckets spending into five levels, so each level holds a similar
 * number of days and a few huge days (rent, travel) don't wash out everyday spending.
 */
export interface CalendarCell {
  date: string;
  week: number;
  weekday: number;
  amountMinor: number;
  count: number;
  /** 0 = no spending, 1–5 = quantile bucket. */
  level: number;
}

export interface CalendarLayout {
  cells: CalendarCell[];
  weeks: number;
  /** First week column of each month, for the month labels. */
  monthStarts: { month: string; week: number }[];
  maxMinor: number;
}

export const HEAT_LEVELS = 5;

const parse = (day: string) => new Date(`${day}T00:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

export function buildCalendar(
  daily: { date: string; amountMinor: number; count: number }[],
  from: string,
  to: string,
): CalendarLayout {
  const start = parse(from);
  const days = utcDay.range(start, utcDay.offset(parse(to), 1));

  const byDay = rollup(
    daily.filter((d) => d.date >= from && d.date <= to),
    (rows) => ({ amountMinor: sum(rows, (r) => r.amountMinor), count: sum(rows, (r) => r.count) }),
    (d) => d.date,
  );
  const spent = [...byDay.values()].map((d) => d.amountMinor).filter((a) => a > 0);
  const level = scaleQuantile<number>()
    .domain(spent.length ? spent : [1])
    .range([1, 2, 3, 4, 5]);

  const weekOf = (date: Date) => utcSunday.count(start, date);
  const cells = days.map((date) => {
    const key = iso(date);
    const entry = byDay.get(key);
    const amountMinor = entry?.amountMinor ?? 0;
    return {
      date: key,
      week: weekOf(date),
      weekday: date.getUTCDay(),
      amountMinor,
      count: entry?.count ?? 0,
      level: amountMinor > 0 ? level(amountMinor) : 0,
    };
  });

  const firstMonth = utcMonth.floor(start);
  const monthStarts = [
    start,
    ...utcMonth.range(utcMonth.offset(firstMonth, 1), utcDay.offset(parse(to), 1)),
  ].map((date) => ({ month: iso(date).slice(0, 7), week: weekOf(date) }));

  return {
    cells,
    weeks: (max(cells, (c) => c.week) ?? -1) + 1,
    monthStarts,
    maxMinor: max(spent) ?? 0,
  };
}
