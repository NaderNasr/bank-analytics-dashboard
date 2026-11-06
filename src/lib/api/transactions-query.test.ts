import { describe, expect, it } from "vitest";

import { parseTransactionsQuery } from "./transactions-query";

const parse = (qs: string) => parseTransactionsQuery(new URLSearchParams(qs));
const ACCOUNT_A = "0b6f7a52-2f4c-4f6a-9d7e-1a2b3c4d5e6f";
const ACCOUNT_B = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

describe("parseTransactionsQuery", () => {
  it("applies defaults for an empty query", () => {
    const result = parse("");
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ page: 1, pageSize: 50, sort: "occurredAt", order: "desc" });
  });

  it("coerces numbers and converts amounts in JOD to fils", () => {
    const result = parse("page=3&pageSize=100&minAmount=12.5&maxAmount=1000");
    expect(result.data).toMatchObject({
      page: 3,
      pageSize: 100,
      minAmount: 12_500,
      maxAmount: 1_000_000,
    });
  });

  it("accepts multi-value filters as repeated keys, comma lists, or both, without duplicates", () => {
    const result = parse(
      `account=${ACCOUNT_A}&account=${ACCOUNT_B},${ACCOUNT_A}&status=failed,reversed&category=coffee`,
    );
    expect(result.data?.account).toEqual([ACCOUNT_A, ACCOUNT_B]);
    expect(result.data?.status).toEqual(["failed", "reversed"]);
    expect(result.data?.category).toEqual(["coffee"]);
  });

  it("trims the search text and ignores empty parameters", () => {
    const result = parse("q=%20%20carrefour%20&status=&from=");
    expect(result.data?.q).toBe("carrefour");
    expect(result.data?.status).toBeUndefined();
    expect(result.data?.from).toBeUndefined();
  });

  it("uses the last value when a single-value key is repeated", () => {
    expect(parse("sort=amount&sort=status").data?.sort).toBe("status");
  });

  it.each([
    ["page=0", "page"],
    ["pageSize=201", "pageSize"],
    ["pageSize=abc", "pageSize"],
    ["sort=password", "sort"],
    ["order=up", "order"],
    ["from=2026-13-01", "from"],
    ["from=01/02/2026", "from"],
    ["account=not-a-uuid", "account"],
    ["status=approved", "status"],
    ["channel=fax", "channel"],
    ["direction=sideways", "direction"],
    ["category=DROP%20TABLE", "category"],
    ["minAmount=-5", "minAmount"],
    ["minAmount=1.2345", "minAmount"],
    [`q=${"x".repeat(101)}`, "q"],
  ])("rejects %s", (qs, path) => {
    const result = parse(qs);
    expect(result.success).toBe(false);
    // List values report the offending item, e.g. "status.0".
    expect(result.error?.issues.map((i) => String(i.path[0]))).toContain(path);
  });

  it("rejects inverted ranges", () => {
    expect(parse("from=2026-02-01&to=2026-01-01").error?.issues[0]?.path).toEqual(["to"]);
    expect(parse("minAmount=50&maxAmount=10").error?.issues[0]?.path).toEqual(["maxAmount"]);
  });

  it("allows a single-day range", () => {
    expect(parse("from=2026-02-01&to=2026-02-01").success).toBe(true);
  });
});
