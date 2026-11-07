import type { Locale } from "@/i18n/routing";

import { toMajor } from "./money";

/**
 * Intl locale per UI language. Arabic keeps Latin digits (`nu-latn`), as Jordanian banking apps
 * do, so amounts read the same in both languages; Arabic still gets Arabic currency symbols and
 * right-to-left marks.
 */
export function intlLocale(locale: Locale): string {
  return locale === "ar" ? "ar-JO-u-nu-latn" : "en-JO";
}

export function formatAmount(
  minor: number,
  currency: string,
  locale: Locale,
  options: { compact?: boolean; signed?: boolean; whole?: boolean } = {},
): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    currencyDisplay: locale === "ar" ? "symbol" : "code",
    ...(options.compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
    ...(options.signed ? { signDisplay: "exceptZero" } : {}),
    ...(options.whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  }).format(toMajor(minor, currency));
}

export function formatPercent(
  value: number,
  locale: Locale,
  options: { signed?: boolean; digits?: number } = {},
): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    maximumFractionDigits: options.digits ?? 1,
    ...(options.signed ? { signDisplay: "exceptZero" } : {}),
  }).format(value);
}

/** "2026-03" → "Mar" / "مارس"; `withYear` adds the year. Month strings are calendar months. */
export function formatMonth(month: string, locale: Locale, withYear = false): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

/** "2026-03-14" → "Sat, 14 Mar 2026" in the UI language. */
export function formatDay(day: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

/** Relative change from `previous` to `current`, or null when there is no base to compare to. */
export function relativeChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}
