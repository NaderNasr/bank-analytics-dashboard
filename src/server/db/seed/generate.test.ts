import { describe, expect, it } from "vitest";

import { CATEGORIES } from "./catalog";
import { generateSeedData, type SeedData } from "./generate";

const data: SeedData = generateSeedData();
const { accounts, transactions: txns } = data;
const accountKey = new Map(accounts.map((a) => [a.id, a.key]));
const localDay = (d: Date) => new Date(d.getTime() + 3 * 3_600_000);

describe("generateSeedData", () => {
  it("is deterministic for a given seed", () => {
    const again = generateSeedData();
    expect(again.transactions).toHaveLength(txns.length);
    expect(again.transactions.slice(0, 50)).toEqual(txns.slice(0, 50));
    expect(again.transactions.at(-1)).toEqual(txns.at(-1));
  });

  it("changes with a different seed", () => {
    const other = generateSeedData({ seed: 1 });
    expect(other.transactions[100]?.id).not.toBe(txns[100]?.id);
  });

  it("uses the given email, and the default when the option is undefined", () => {
    expect(data.user.email).toBe("demo@bank-analytics.dev");
    expect(generateSeedData({ months: 1, email: "someone@example.com" }).user.email).toBe(
      "someone@example.com",
    );
    expect(generateSeedData({ months: 1, email: undefined }).user.email).toBe(
      "demo@bank-analytics.dev",
    );
  });

  it("creates one customer with a current, a savings and a card account in JOD", () => {
    expect(accounts.map((a) => a.type).sort()).toEqual(["card", "current", "savings"]);
    expect(new Set(accounts.map((a) => a.userId))).toEqual(new Set([data.user.id]));
    expect(accounts.every((a) => a.currency === "JOD")).toBe(true);
    expect(accounts.find((a) => a.type === "card")?.creditLimitMinor).toBeGreaterThan(0);
  });

  it("produces about 12,000 transactions over 18 months", () => {
    expect(txns.length).toBeGreaterThan(11_000);
    expect(txns.length).toBeLessThan(13_000);
    const first = txns.reduce((m, t) => (t.occurredAt < m ? t.occurredAt : m), txns[0]!.occurredAt);
    const last = txns.reduce((m, t) => (t.occurredAt > m ? t.occurredAt : m), txns[0]!.occurredAt);
    const months = (last.getTime() - first.getTime()) / (30.44 * 86_400_000);
    expect(months).toBeGreaterThan(17.5);
    expect(months).toBeLessThan(18.1);
  });

  it("keeps every row valid: positive integer amounts, unique ids and references, known categories", () => {
    const slugs = new Set<string>(CATEGORIES.map((c) => c.slug));
    expect(txns.every((t) => Number.isSafeInteger(t.amountMinor) && t.amountMinor > 0)).toBe(true);
    expect(new Set(txns.map((t) => t.id)).size).toBe(txns.length);
    expect(new Set(txns.map((t) => t.reference)).size).toBe(txns.length);
    expect(txns.every((t) => slugs.has(t.categorySlug))).toBe(true);
    expect(txns.every((t) => accountKey.has(t.accountId))).toBe(true);
  });

  it("pays the salary once a month into the current account, never on Friday or Saturday", () => {
    const salaries = txns.filter((t) => t.categorySlug === "salary");
    expect(salaries).toHaveLength(18);
    for (const s of salaries) {
      expect(accountKey.get(s.accountId)).toBe("current");
      expect(s.direction).toBe("credit");
      expect([5, 6]).not.toContain(localDay(s.occurredAt).getUTCDay());
    }
    const months = new Set(salaries.map((s) => s.occurredAt.toISOString().slice(0, 7)));
    expect(months.size).toBe(18);
  });

  it("pays rent and subscriptions on a monthly cycle", () => {
    expect(txns.filter((t) => t.categorySlug === "rent")).toHaveLength(18);
    const netflix = txns.filter((t) => t.description.startsWith("NETFLIX"));
    expect(netflix).toHaveLength(18);
    expect(new Set(netflix.map((t) => localDay(t.occurredAt).getUTCDate()))).toEqual(new Set([3]));
  });

  it("spends more often at the weekend", () => {
    const purchases = txns.filter((t) => t.channel === "card_present" || t.channel === "online");
    const counts = new Map<number, number>();
    for (const t of purchases) {
      const dow = localDay(t.occurredAt).getUTCDay();
      counts.set(dow, (counts.get(dow) ?? 0) + 1);
    }
    const weekend = ((counts.get(5) ?? 0) + (counts.get(6) ?? 0)) / 2;
    const weekday = [0, 1, 2, 3, 4].reduce((s, d) => s + (counts.get(d) ?? 0), 0) / 5;
    expect(weekend / weekday).toBeGreaterThan(1.4);
  });

  it("includes occasional failed and reversed transactions, and nothing left pending", () => {
    const share = (status: string) => txns.filter((t) => t.status === status).length / txns.length;
    expect(share("failed")).toBeGreaterThan(0.002);
    expect(share("failed")).toBeLessThan(0.03);
    expect(share("reversed")).toBeGreaterThan(0.001);
    expect(share("reversed")).toBeLessThan(0.01);
    // The history ends days in the past, so every card payment has settled.
    expect(share("pending")).toBe(0);
    expect(txns.filter((t) => t.status === "failed").every((t) => t.postedAt === null)).toBe(true);
  });

  it("links refunds to an earlier posted purchase on the same account", () => {
    const byId = new Map(txns.map((t) => [t.id, t]));
    const refunds = txns.filter((t) => t.refundOfId);
    expect(refunds.length).toBeGreaterThan(0);
    for (const r of refunds) {
      const original = byId.get(r.refundOfId!);
      expect(original).toBeDefined();
      expect(original!.status).toBe("posted");
      expect(original!.accountId).toBe(r.accountId);
      expect(r.direction).toBe("credit");
      expect(r.amountMinor).toBeLessThanOrEqual(original!.amountMinor);
      expect(r.occurredAt.getTime()).toBeGreaterThan(original!.occurredAt.getTime());
    }
  });

  it("books transfers between own accounts as two matching legs", () => {
    const groups = new Map<string, typeof txns>();
    for (const t of txns.filter((t) => t.transferGroupId)) {
      groups.set(t.transferGroupId!, [...(groups.get(t.transferGroupId!) ?? []), t]);
    }
    expect(groups.size).toBeGreaterThan(18);
    for (const legs of groups.values()) {
      expect(legs).toHaveLength(2);
      expect(legs.map((l) => l.direction).sort()).toEqual(["credit", "debit"]);
      expect(legs[0]!.amountMinor).toBe(legs[1]!.amountMinor);
      expect(legs[0]!.accountId).not.toBe(legs[1]!.accountId);
    }
  });

  it("never overdraws the current account or exceeds the card limit", () => {
    const balance = new Map(accounts.map((a) => [a.id, a.openingBalanceMinor]));
    const card = accounts.find((a) => a.type === "card")!;
    const current = accounts.find((a) => a.type === "current")!;
    const ordered = [...txns].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    for (const t of ordered) {
      if (t.status !== "posted") continue;
      const next =
        balance.get(t.accountId)! + (t.direction === "credit" ? t.amountMinor : -t.amountMinor);
      balance.set(t.accountId, next);
      if (t.accountId === current.id) expect(next).toBeGreaterThanOrEqual(0);
      if (t.accountId === card.id) expect(next).toBeGreaterThanOrEqual(-card.creditLimitMinor!);
    }
  });
});
