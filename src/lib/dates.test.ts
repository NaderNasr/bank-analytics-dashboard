import { describe, expect, it } from "vitest";

import { addDays, addMonths, daysInRange, localDay, localDayStart, monthsInRange } from "./dates";

describe("dates (Amman, UTC+3)", () => {
  it("maps instants to local days across midnight", () => {
    expect(localDay(new Date("2026-03-31T20:59:59Z"))).toBe("2026-03-31");
    expect(localDay(new Date("2026-03-31T21:00:00Z"))).toBe("2026-04-01");
  });

  it("starts a local day at 21:00 UTC the previous day", () => {
    expect(localDayStart("2026-04-01").toISOString()).toBe("2026-03-31T21:00:00.000Z");
  });

  it("does calendar arithmetic", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addMonths("2026-01-15", -2)).toBe("2025-11-15");
    expect(addMonths("2026-10-31", -11)).toBe("2025-11-30");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(daysInRange("2026-01-01", "2026-01-31")).toBe(31);
    expect(monthsInRange("2025-11-20", "2026-02-03")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});
