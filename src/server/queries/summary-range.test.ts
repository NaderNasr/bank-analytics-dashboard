import { describe, expect, it } from "vitest";

import { resolveSummaryRange } from "./summary-range";

describe("resolveSummaryRange", () => {
  it("defaults to the 12 calendar months ending on the anchor day", () => {
    expect(resolveSummaryRange({}, "2026-10-31")).toEqual({
      from: "2025-11-01",
      to: "2026-10-31",
      previousFrom: "2024-11-01",
      previousTo: "2025-10-31",
    });
  });

  it("keeps a partial current month", () => {
    expect(resolveSummaryRange({}, "2026-03-10")).toMatchObject({
      from: "2025-04-01",
      to: "2026-03-10",
    });
  });

  it("uses an explicit range and a previous range of the same length", () => {
    expect(resolveSummaryRange({ from: "2026-02-01", to: "2026-02-28" }, "2026-10-31")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
      previousFrom: "2026-01-04",
      previousTo: "2026-01-31",
    });
  });

  it("fills in `from` when only `to` is given", () => {
    expect(resolveSummaryRange({ to: "2026-06-15" }, "2026-10-31").from).toBe("2025-07-01");
  });
});
