import { describe, expect, it } from "vitest";

import { currencyExponent, formatMoney, toMajor, toMinor } from "./money";

describe("money", () => {
  it("knows currency exponents", () => {
    expect(currencyExponent("JOD")).toBe(3);
    expect(currencyExponent("USD")).toBe(2);
    expect(currencyExponent("JPY")).toBe(0);
  });

  it("converts JOD to fils and back without float drift", () => {
    expect(toMinor(12.5, "JOD")).toBe(12_500);
    expect(toMinor(0.1 + 0.2, "JOD")).toBe(300);
    expect(toMinor(-1.0005, "JOD")).toBe(-1_001);
    expect(toMajor(12_345, "JOD")).toBe(12.345);
  });

  it("formats with the currency's decimals", () => {
    // Intl separates code and amount with a no-break space.
    expect(formatMoney(1_234_500, "JOD", "en")).toBe("JOD\u00a01,234.500");
    expect(formatMoney(1_234_50, "USD", "en-US")).toBe("$1,234.50");
  });
});
