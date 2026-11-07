import { describe, expect, it } from "vitest";

import { backoffDelay } from "@/hooks/backoff";

import { parseTicker, subscribeMessage } from "./coinbase";
import { INSTRUMENTS } from "./instruments";
import { applyTicks, changeFromOpen, HISTORY_LENGTH } from "./quotes";
import { createSimulatedFeed, mulberry32 } from "./simulated-feed";

const toId = (p: string) => ({ "BTC-USD": "BTC", "ETH-USD": "ETH" })[p];

describe("backoffDelay", () => {
  it("grows exponentially up to the cap, with jitter", () => {
    const max = () => 0.999_999;
    expect(backoffDelay(0, { random: max })).toBe(500);
    expect(backoffDelay(3, { random: max })).toBe(4_000);
    expect(backoffDelay(10, { random: max })).toBe(15_000);
    expect(backoffDelay(3, { random: () => 0 })).toBe(0);
  });
});

describe("Coinbase ticker", () => {
  it("builds a subscribe message", () => {
    expect(JSON.parse(subscribeMessage(["BTC-USD"]))).toEqual({
      type: "subscribe",
      product_ids: ["BTC-USD"],
      channels: ["ticker"],
    });
  });

  it("parses a ticker for a known product", () => {
    const tick = parseTicker(
      JSON.stringify({
        type: "ticker",
        product_id: "BTC-USD",
        price: "98123.45",
        open_24h: "97000.00",
        high_24h: "99000",
        low_24h: "96500",
        time: "2026-11-07T10:00:00.000Z",
      }),
      toId,
    );
    expect(tick).toEqual({
      id: "BTC",
      price: 98_123.45,
      open24h: 97_000,
      high24h: 99_000,
      low24h: 96_500,
      time: Date.parse("2026-11-07T10:00:00.000Z"),
    });
  });

  it.each([
    ["not JSON", "{oops"],
    ["subscriptions ack", JSON.stringify({ type: "subscriptions", channels: [] })],
    ["unknown product", JSON.stringify({ type: "ticker", product_id: "DOGE-USD", price: "1" })],
    ["bad price", JSON.stringify({ type: "ticker", product_id: "BTC-USD", price: "-5" })],
    ["price as number", JSON.stringify({ type: "ticker", product_id: "BTC-USD", price: 5 })],
    ["null", "null"],
  ])("ignores %s", (_label, raw) => {
    expect(parseTicker(raw, toId)).toBeNull();
  });
});

describe("applyTicks", () => {
  it("tracks price, direction, range and a bounded history", () => {
    let q = applyTicks({}, [{ id: "BTC", price: 100, open24h: 90, time: 1 }], "live");
    expect(q.BTC).toMatchObject({
      price: 100,
      open: 90,
      move: "flat",
      history: [100],
      source: "live",
    });
    q = applyTicks(q, [{ id: "BTC", price: 105, time: 2 }], "live");
    expect(q.BTC).toMatchObject({ move: "up", high: 105, low: 100, open: 90 });
    q = applyTicks(q, [{ id: "BTC", price: 99, time: 3 }], "live");
    expect(q.BTC?.move).toBe("down");
    expect(changeFromOpen(q.BTC!)).toBeCloseTo(0.1);

    for (let i = 0; i < 200; i++)
      q = applyTicks(q, [{ id: "BTC", price: 100 + i, time: 4 + i }], "live");
    expect(q.BTC?.history).toHaveLength(HISTORY_LENGTH);
  });

  it("returns the same object for an empty batch", () => {
    const q = {};
    expect(applyTicks(q, [], "live")).toBe(q);
  });
});

describe("simulated feed", () => {
  it("is deterministic for a seed and stays near its seed price", () => {
    const a = createSimulatedFeed(INSTRUMENTS, mulberry32(7));
    const b = createSimulatedFeed(INSTRUMENTS, mulberry32(7));
    expect(a(0)).toEqual(b(0));

    let last = a(1);
    for (let i = 2; i < 5_000; i++) last = a(i);
    for (const tick of last) {
      const seed = INSTRUMENTS.find((x) => x.id === tick.id)!.seedPrice;
      expect(tick.price).toBeGreaterThan(seed * 0.7);
      expect(tick.price).toBeLessThan(seed * 1.3);
    }
  });
});
