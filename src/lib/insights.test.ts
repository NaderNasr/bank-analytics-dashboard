import { describe, expect, it } from "vitest";

import { buildSavingsReport, type SpendingStats } from "./insights";

const base: SpendingStats = {
  days: 304.4, // ten months
  subscriptions: [],
  coffee: { totalMinor: 0, count: 0 },
  delivery: { totalMinor: 0, count: 0 },
  rides: { totalMinor: 0, count: 0 },
  fees: { foreignMinor: 0, foreignCount: 0, atmMinor: 0, atmCount: 0 },
  weekend: { weekendMinor: 0, weekendDays: 0, weekdayMinor: 0, weekdayDays: 0 },
};

const insight = (stats: Partial<SpendingStats>, id: string) =>
  buildSavingsReport({ ...base, ...stats }).insights.find((i) => i.id === id);

describe("buildSavingsReport", () => {
  it("suggests cancelling the cheaper of two overlapping services", () => {
    const music = insight(
      {
        subscriptions: [
          { merchant: "Spotify", averageMinor: 3_490, charges: 10 },
          { merchant: "Anghami Plus", averageMinor: 2_990, charges: 10 },
          { merchant: "Netflix", averageMinor: 5_990, charges: 10 },
          { merchant: "iCloud", averageMinor: 990, charges: 10 },
        ],
      },
      "overlappingMusic",
    );
    expect(music).toMatchObject({
      monthlySavingMinor: 2_990,
      evidence: {
        cheaper: "Anghami Plus",
        services: "Anghami Plus + Spotify",
        monthlyTotalMinor: 6_480,
      },
      link: { category: "subscriptions" },
    });
    // Only one video service: nothing to cut there.
    expect(
      insight(
        { subscriptions: [{ merchant: "Netflix", averageMinor: 5_990, charges: 10 }] },
        "overlappingVideo",
      ),
    ).toBeUndefined();
  });

  it("estimates coffee savings from half the visits brewed at home", () => {
    // 1,000 visits at JOD 2.500 over ten months: 500 replaced × (2.500 − 0.350) / 10 = JOD 107.5
    const coffee = insight({ coffee: { totalMinor: 2_500_000, count: 1_000 } }, "coffee");
    expect(coffee?.monthlySavingMinor).toBe(107_500);
    expect(coffee?.evidence).toMatchObject({
      visitsPerMonth: 100,
      monthlyMinor: 250_000,
      averageMinor: 2_500,
    });
  });

  it("estimates delivery and ride savings", () => {
    // JOD 4,000 of delivery: half replaced, cooking at 40% → 4,000 × 0.5 × 0.6 / 10 = JOD 120
    expect(
      insight({ delivery: { totalMinor: 4_000_000, count: 300 } }, "delivery")?.monthlySavingMinor,
    ).toBe(120_000);
    // 900 rides at JOD 3.000: a third by bus at 0.500 → 300 × 2.500 / 10 = JOD 75
    expect(
      insight({ rides: { totalMinor: 2_700_000, count: 900 } }, "rides")?.monthlySavingMinor,
    ).toBe(75_000);
  });

  it("counts foreign-currency and off-network ATM fees as avoidable", () => {
    const fees = insight(
      { fees: { foreignMinor: 80_000, foreignCount: 100, atmMinor: 10_000, atmCount: 20 } },
      "fees",
    );
    expect(fees?.monthlySavingMinor).toBe(9_000);
  });

  it("flags expensive weekends only past the trigger", () => {
    const pricey = insight(
      {
        weekend: {
          weekendMinor: 870_000,
          weekendDays: 87,
          weekdayMinor: 1_090_000,
          weekdayDays: 218,
        },
      },
      "weekend",
    );
    expect(pricey?.evidence).toMatchObject({
      weekendDailyMinor: 10_000,
      weekdayDailyMinor: 5_000,
      percentMore: 100,
    });
    expect(pricey!.monthlySavingMinor).toBeGreaterThan(0);

    const fine = insight(
      {
        weekend: {
          weekendMinor: 470_000,
          weekendDays: 87,
          weekdayMinor: 1_090_000,
          weekdayDays: 218,
        },
      },
      "weekend",
    );
    expect(fine).toBeUndefined();
  });

  it("drops tiny savings, sorts by size and totals the rest", () => {
    const report = buildSavingsReport({
      ...base,
      coffee: { totalMinor: 2_500_000, count: 1_000 },
      rides: { totalMinor: 2_700_000, count: 900 },
      fees: { foreignMinor: 5_000, foreignCount: 10, atmMinor: 0, atmCount: 0 }, // JOD 0.5/month
    });
    expect(report.insights.map((i) => i.id)).toEqual(["coffee", "rides"]);
    expect(report.totalMonthlySavingMinor).toBe(182_500);
    expect(report.months).toBe(10);
  });

  it("returns nothing for an empty history", () => {
    expect(buildSavingsReport(base)).toEqual({
      months: 10,
      totalMonthlySavingMinor: 0,
      insights: [],
    });
  });
});
