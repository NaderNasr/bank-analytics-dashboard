/**
 * Money helpers. Amounts travel as integer minor units; the number of decimals comes from the
 * currency (ISO 4217): JOD = 3, USD = 2, JPY = 0. Intl already knows these exponents.
 */

const exponentCache = new Map<string, number>();

export function currencyExponent(currency: string): number {
  const cached = exponentCache.get(currency);
  if (cached !== undefined) return cached;
  const exponent = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits;
  if (exponent === undefined) throw new Error(`Unknown currency exponent for ${currency}`);
  exponentCache.set(currency, exponent);
  return exponent;
}

/** 12.5 JOD → 12500 (fils). Rounds half away from zero to the nearest minor unit. */
export function toMinor(major: number, currency: string): number {
  const factor = 10 ** currencyExponent(currency);
  return Math.sign(major) * Math.round(Math.abs(major) * factor);
}

/** 12500 (fils) → 12.5 JOD. For display and charts only; never do arithmetic on the result. */
export function toMajor(minor: number, currency: string): number {
  return minor / 10 ** currencyExponent(currency);
}

export function formatMoney(
  minor: number,
  currency: string,
  locale = "en",
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, ...options }).format(
    toMajor(minor, currency),
  );
}
