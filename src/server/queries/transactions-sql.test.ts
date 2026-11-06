import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { transactionsQuerySchema } from "@/lib/api/transactions-query";

import { buildTransactionOrderBy, buildTransactionWhere, escapeLike } from "./transactions-sql";

const dialect = new PgDialect({ casing: "snake_case" });
const render = (sql: SQL | undefined) => (sql ? dialect.sqlToQuery(sql) : undefined);
const query = (input: Record<string, unknown>) => transactionsQuerySchema.parse(input);

describe("escapeLike", () => {
  it("escapes LIKE wildcards and the escape character", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(escapeLike("carrefour")).toBe("carrefour");
  });
});

describe("buildTransactionWhere", () => {
  it("returns no condition when there are no filters", () => {
    expect(buildTransactionWhere(query({}))).toBeUndefined();
  });

  it("turns an inclusive local date range into a half-open UTC range (Amman is UTC+3)", () => {
    const q = render(buildTransactionWhere(query({ from: "2026-01-01", to: "2026-01-31" })));
    expect(q?.sql).toBe(
      '("transactions"."occurred_at" >= $1 and "transactions"."occurred_at" < $2)',
    );
    expect(q?.params).toEqual(["2025-12-31T21:00:00.000Z", "2026-01-31T21:00:00.000Z"]);
  });

  it("filters list values with IN and amounts in minor units", () => {
    const q = render(
      buildTransactionWhere(
        query({
          category: "coffee,dining",
          status: "failed",
          direction: "debit",
          minAmount: "10",
          maxAmount: "99.999",
        }),
      ),
    );
    expect(q?.sql).toContain('"categories"."slug" in ($1, $2)');
    expect(q?.sql).toContain('"transactions"."status" in ($3)');
    expect(q?.sql).toContain('"transactions"."direction" = $4');
    expect(q?.sql).toContain('"transactions"."amount_minor" >= $5');
    expect(q?.sql).toContain('"transactions"."amount_minor" <= $6');
    expect(q?.params).toEqual(["coffee", "dining", "failed", "debit", 10_000, 99_999]);
  });

  it("searches description, merchant name and reference with a parameterised, escaped pattern", () => {
    const q = render(buildTransactionWhere(query({ q: "100%' OR 1=1 --" })));
    expect(q?.sql).toBe(
      '("transactions"."description" ILIKE $1 or "merchants"."name" ILIKE $2 or "transactions"."reference" ILIKE $3)',
    );
    expect(q?.params).toEqual(Array(3).fill("%100\\%' OR 1=1 --%"));
  });

  it("combines every filter with AND", () => {
    const q = render(
      buildTransactionWhere(
        query({
          from: "2026-01-01",
          account: "0b6f7a52-2f4c-4f6a-9d7e-1a2b3c4d5e6f",
          channel: "atm",
          q: "atm",
        }),
      ),
    );
    expect(q?.sql.match(/ and /g)).toHaveLength(3);
    expect(q?.sql).toContain('"transactions"."account_id" in ($2)');
    expect(q?.sql).toContain('"transactions"."channel" in ($3)');
  });
});

describe("buildTransactionOrderBy", () => {
  const renderOrder = (input: Record<string, unknown>) =>
    buildTransactionOrderBy(query(input))
      .map((part) => dialect.sqlToQuery(part).sql)
      .join(", ");

  it("defaults to newest first with id as a tie-breaker", () => {
    expect(renderOrder({})).toBe('"transactions"."occurred_at" desc, "transactions"."id" desc');
  });

  it("sorts by amount, then date, then id for stable pages", () => {
    expect(renderOrder({ sort: "amount", order: "asc" })).toBe(
      '"transactions"."amount_minor" asc, "transactions"."occurred_at" desc, "transactions"."id" asc',
    );
  });

  it("sorts by joined columns", () => {
    expect(renderOrder({ sort: "category" })).toMatch(/^"categories"."slug" desc/);
    expect(renderOrder({ sort: "account" })).toMatch(/^"accounts"."name" desc/);
  });
});
