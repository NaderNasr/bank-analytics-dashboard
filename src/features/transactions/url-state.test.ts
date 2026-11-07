import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  filtersFromSearchParams,
  nextSort,
  toSearchParams,
  type ExplorerFilters,
} from "./url-state";

const parse = (qs: string) => filtersFromSearchParams(new URLSearchParams(qs));

describe("filtersFromSearchParams", () => {
  it("defaults to newest first with no filters", () => {
    expect(parse("")).toEqual({ sort: "occurredAt", order: "desc" });
  });

  it("reads every supported filter", () => {
    expect(
      parse(
        "q=talabat&from=2026-01-01&to=2026-03-31&category=dining&status=failed&direction=debit&sort=amount&order=asc",
      ),
    ).toEqual({
      q: "talabat",
      from: "2026-01-01",
      to: "2026-03-31",
      category: "dining",
      status: "failed",
      direction: "debit",
      sort: "amount",
      order: "asc",
    });
  });

  it("drops invalid values instead of failing", () => {
    expect(parse("from=yesterday&status=lost&sort=hacked&order=up&category=DROP%20TABLE")).toEqual({
      sort: "occurredAt",
      order: "desc",
    });
  });

  it("drops an end date before the start date", () => {
    expect(parse("from=2026-03-01&to=2026-01-01")).toMatchObject({ from: "2026-03-01" });
    expect(parse("from=2026-03-01&to=2026-01-01").to).toBeUndefined();
  });
});

describe("toSearchParams", () => {
  it("omits defaults and empty values", () => {
    expect(toSearchParams({ sort: "occurredAt", order: "desc", q: "" }).toString()).toBe("");
  });

  it("round-trips through the URL", () => {
    const filters: ExplorerFilters = {
      q: "coffee & cake",
      category: "coffee",
      direction: "debit",
      sort: "amount",
      order: "desc",
    };
    const qs = toSearchParams(filters).toString();
    expect(qs).toBe("q=coffee+%26+cake&category=coffee&direction=debit&sort=amount&order=desc");
    expect(parse(qs)).toEqual(filters);
  });
});

describe("helpers", () => {
  it("counts active filters, not sorting", () => {
    expect(activeFilterCount({ sort: "amount", order: "asc", q: "x", status: "pending" })).toBe(2);
  });

  it("sorts a new column descending and flips the current one", () => {
    const base: ExplorerFilters = { sort: "occurredAt", order: "desc" };
    expect(nextSort(base, "amount")).toEqual({ sort: "amount", order: "desc" });
    expect(nextSort(base, "occurredAt")).toEqual({ sort: "occurredAt", order: "asc" });
    expect(nextSort(base, "description")).toEqual({ sort: "description", order: "asc" });
  });
});
