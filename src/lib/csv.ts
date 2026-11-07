/**
 * RFC 4180 CSV with protection against formula injection: a cell starting with = + - @ (or a
 * tab/CR) is prefixed with an apostrophe so spreadsheet apps show it as text instead of running
 * it. Merchant names and descriptions are data we don't fully control, so this matters.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function csvRow(values: (string | number | null | undefined)[]): string {
  return `${values.map(csvCell).join(",")}\r\n`;
}
