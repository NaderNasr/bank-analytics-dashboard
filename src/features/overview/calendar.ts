import { scaleQuantize } from "d3-scale";

/**
 * Pure layout for the calendar heatmap: one column per week (Sunday first, the Jordanian working
 * week), one row per weekday, every day in the range present even when nothing was spent.
 */
export interface CalendarCell {
  date: string;
  week: number;
  weekday: number;
  amountMinor: number;
  count: number;
  /** 0 = no spending, 1–5 = quantized intensity. */
  level: number;
}

export interface CalendarLayout {
  cells: CalendarCell[];
  weeks: number;
  /** First column index of each month, for the month labels. */
  monthStarts: { month: string; week: number }[];
  maxMinor: number;
}

const DAY_MS = 86_400_000;
export const HEAT_LEVELS = 5;

function parse(day: string) {
  return Date.parse(`${day}T00:00:00Z`);
}

function format(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function buildCalendar(
  daily: { date: string; amountMinor: number; count: number }[],
  from: string,
  to: string,
): CalendarLayout {
  const byDay = new Map(daily.map((d) => [d.date, d]));
  const start = parse(from);
  const end = parse(to);
  const firstWeekday = new Date(start).getUTCDay();

  const amounts = daily.filter((d) => d.date >= from && d.date <= to).map((d) => d.amountMinor);
  const maxMinor = amounts.length ? Math.max(...amounts) : 0;
  // Quantize on a square-root scale so a few very large days (rent, travel) don't wash out the rest.
  const level = scaleQuantize<number>()
    .domain([0, Math.sqrt(maxMinor || 1)])
    .range([1, 2, 3, 4, 5]);

  const cells: CalendarCell[] = [];
  const monthStarts: CalendarLayout["monthStarts"] = [];
  for (let ms = start, i = 0; ms <= end; ms += DAY_MS, i++) {
    const date = format(ms);
    const offset = i + firstWeekday;
    const week = Math.floor(offset / 7);
    const entry = byDay.get(date);
    const amountMinor = entry?.amountMinor ?? 0;
    if (date.endsWith("-01") || i === 0) monthStarts.push({ month: date.slice(0, 7), week });
    cells.push({
      date,
      week,
      weekday: offset % 7,
      amountMinor,
      count: entry?.count ?? 0,
      level: amountMinor > 0 ? level(Math.sqrt(amountMinor)) : 0,
    });
  }
  const last = cells.at(-1);
  return { cells, weeks: last ? last.week + 1 : 0, monthStarts, maxMinor };
}
