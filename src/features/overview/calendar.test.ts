import { describe, expect, it } from "vitest";

import { buildCalendar } from "./calendar";

describe("buildCalendar", () => {
  // 2026-02-01 is a Sunday.
  const layout = buildCalendar(
    [
      { date: "2026-02-01", amountMinor: 1_000, count: 1 },
      { date: "2026-02-10", amountMinor: 100_000, count: 4 },
      { date: "2026-03-02", amountMinor: 25_000, count: 2 },
    ],
    "2026-02-01",
    "2026-03-07",
  );

  it("includes every day of the range, Sunday-first", () => {
    expect(layout.cells).toHaveLength(35);
    expect(layout.cells[0]).toMatchObject({ date: "2026-02-01", week: 0, weekday: 0 });
    expect(layout.cells.at(-1)).toMatchObject({ date: "2026-03-07", week: 4, weekday: 6 });
    expect(layout.weeks).toBe(5);
  });

  it("marks days without spending as level 0 and the largest day as level 5", () => {
    const level = (date: string) => layout.cells.find((c) => c.date === date)?.level;
    expect(level("2026-02-02")).toBe(0);
    expect(level("2026-02-10")).toBe(5);
    expect(level("2026-02-01")).toBeGreaterThanOrEqual(1);
    expect(level("2026-03-02")).toBeGreaterThan(level("2026-02-01") ?? 0);
  });

  it("records where each month starts", () => {
    expect(layout.monthStarts).toEqual([
      { month: "2026-02", week: 0 },
      { month: "2026-03", week: 4 },
    ]);
  });

  it("offsets a range that starts mid-week", () => {
    const mid = buildCalendar([], "2026-02-04", "2026-02-10"); // Wednesday
    expect(mid.cells[0]).toMatchObject({ week: 0, weekday: 3 });
    expect(mid.cells.at(-1)).toMatchObject({ week: 1, weekday: 2 });
    expect(mid.maxMinor).toBe(0);
  });
});
