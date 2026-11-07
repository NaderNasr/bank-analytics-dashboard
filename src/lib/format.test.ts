import { describe, expect, it } from "vitest";

import { formatAmount, formatMonth, formatPercent, relativeChange } from "./format";

describe("formatAmount", () => {
  it("formats fils as JOD with three decimals", () => {
    expect(formatAmount(1_234_500, "JOD", "en")).toBe("JOD 1,234.500");
  });

  it("keeps Latin digits in Arabic", () => {
    const text = formatAmount(1_234_500, "JOD", "ar");
    expect(text).toMatch(/1,234\.500/);
    expect(text).toMatch(/د\.أ/);
  });

  it("compacts large values and can sign them", () => {
    expect(formatAmount(57_600_000, "JOD", "en", { compact: true })).toBe("JOD 57.6K");
    expect(formatAmount(-12_300, "JOD", "en", { signed: true })).toBe("-JOD 12.300");
  });
});

describe("formatPercent and formatMonth", () => {
  it("formats signed percentages", () => {
    expect(formatPercent(0.042, "en", { signed: true })).toBe("+4.2%");
  });

  it("formats calendar months without time-zone drift", () => {
    expect(formatMonth("2026-03", "en")).toBe("Mar");
    expect(formatMonth("2026-03", "en", true)).toBe("Mar 2026");
  });
});

describe("relativeChange", () => {
  it("is null without a base", () => {
    expect(relativeChange(10, 0)).toBeNull();
    expect(relativeChange(110, 100)).toBeCloseTo(0.1);
    expect(relativeChange(90, 100)).toBeCloseTo(-0.1);
  });
});
