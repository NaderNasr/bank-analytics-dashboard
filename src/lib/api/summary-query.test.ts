import { describe, expect, it } from "vitest";

import { parseSummaryQuery } from "./summary-query";

const parse = (qs: string) => parseSummaryQuery(new URLSearchParams(qs));

describe("parseSummaryQuery", () => {
  it("accepts an empty query", () => {
    expect(parse("").data).toEqual({ months: 12 });
  });

  it("accepts a range and accounts", () => {
    const id = "0b6f7a52-2f4c-4f6a-9d7e-1a2b3c4d5e6f";
    expect(parse(`from=2026-01-01&to=2026-03-31&account=${id}`).data).toEqual({
      from: "2026-01-01",
      to: "2026-03-31",
      account: [id],
      months: 12,
    });
  });

  it("rejects inverted, malformed or overly long ranges", () => {
    expect(parse("from=2026-02-01&to=2026-01-01").success).toBe(false);
    expect(parse("from=yesterday").success).toBe(false);
    expect(parse("from=2020-01-01&to=2026-01-01").success).toBe(false);
  });

  it("defaults to 12 months and bounds the window", () => {
    const parsed = parseSummaryQuery(new URLSearchParams(""));
    expect(parsed.success && parsed.data.months).toBe(12);
    expect(parseSummaryQuery(new URLSearchParams("months=3")).data?.months).toBe(3);
    expect(parseSummaryQuery(new URLSearchParams("months=0")).success).toBe(false);
    expect(parseSummaryQuery(new URLSearchParams("months=37")).success).toBe(false);
  });
});
