import { APP_UTC_OFFSET_HOURS } from "@/lib/constants";

/**
 * Calendar-day helpers. Days are "YYYY-MM-DD" strings in the bank's local time (Amman, UTC+3).
 * Arithmetic is done on UTC midnights so it never depends on the server's time zone.
 */

const DAY_MS = 86_400_000;
const OFFSET_MS = APP_UTC_OFFSET_HOURS * 3_600_000;

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toDay = (date: Date) => date.toISOString().slice(0, 10);

/** The local calendar day for an instant. */
export function localDay(instant: Date): string {
  return toDay(new Date(instant.getTime() + OFFSET_MS));
}

/** The UTC instant at which a local day starts. */
export function localDayStart(day: string): Date {
  return new Date(toDate(day).getTime() - OFFSET_MS);
}

export function addDays(day: string, days: number): string {
  return toDay(new Date(toDate(day).getTime() + days * DAY_MS));
}

/** Calendar months; clamps to the last day of the target month (Jan 31 + 1 month = Feb 28). */
export function addMonths(day: string, months: number): string {
  const d = toDate(day);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return toDay(target);
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Inclusive number of days between two local days. */
export function daysInRange(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS) + 1;
}

/** "YYYY-MM" for every month touched by the range, oldest first. */
export function monthsInRange(from: string, to: string): string[] {
  const months: string[] = [];
  for (let m = startOfMonth(from); m <= to; m = addMonths(m, 1)) months.push(m.slice(0, 7));
  return months;
}
