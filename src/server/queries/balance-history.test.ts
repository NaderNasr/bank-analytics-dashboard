import { describe, expect, it } from "vitest";

import { balanceHistory } from "./balance-history";

describe("balanceHistory", () => {
  it("walks back from the current balance", () => {
    const history = balanceHistory(
      1_000,
      [
        { date: "2026-01-02", netMinor: 300 },
        { date: "2026-01-03", netMinor: -100 },
      ],
      "2026-01-01",
      "2026-01-03",
    );
    expect(history).toEqual([
      { date: "2026-01-01", totalMinor: 800 },
      { date: "2026-01-02", totalMinor: 1_100 },
      { date: "2026-01-03", totalMinor: 1_000 },
    ]);
  });

  it("removes movements after the range from the end balance", () => {
    const history = balanceHistory(
      1_000,
      [
        { date: "2026-01-02", netMinor: 50 },
        { date: "2026-01-05", netMinor: 200 },
      ],
      "2026-01-01",
      "2026-01-02",
    );
    expect(history).toEqual([
      { date: "2026-01-01", totalMinor: 750 },
      { date: "2026-01-02", totalMinor: 800 },
    ]);
  });

  it("has one point per day even without movements", () => {
    expect(balanceHistory(5, [], "2026-02-01", "2026-02-28")).toHaveLength(28);
  });
});
