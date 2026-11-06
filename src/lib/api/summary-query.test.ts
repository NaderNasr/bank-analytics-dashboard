import { describe, expect, it } from "vitest";

import { parseSummaryQuery } from "./summary-query";

const parse = (qs: string) => parseSummaryQuery(new URLSearchParams(qs));

describe("parseSummaryQuery", () => {
  it("accepts an empty query", () => {
    expect(parse("").data).toEqual({});
  });

  it("accepts a range and accounts", () => {
    const id = "0b6f7a52-2f4c-4f6a-9d7e-1a2b3c4d5e6f";
    expect(parse(`from=2026-01-01&to=2026-03-31&account=${id}`).data).toEqual({
      from: "2026-01-01",
      to: "2026-03-31",
      account: [id],
    });
  });

  it("rejects inverted, malformed or overly long ranges", () => {
    expect(parse("from=2026-02-01&to=2026-01-01").success).toBe(false);
    expect(parse("from=yesterday").success).toBe(false);
    expect(parse("from=2020-01-01&to=2026-01-01").success).toBe(false);
  });
});
