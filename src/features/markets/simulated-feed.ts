import type { Tick } from "./coinbase";
import type { Instrument } from "./instruments";

/** Small deterministic PRNG (mulberry32) so tests and the demo are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * A random walk per instrument with a gentle pull back towards its seed price, so a long-running
 * tab never drifts somewhere absurd. Used for instruments without a free live feed, and as the
 * fallback when the live feed is unreachable.
 */
export function createSimulatedFeed(
  instruments: readonly Instrument[],
  random: () => number = Math.random,
) {
  const prices = new Map(instruments.map((i) => [i.id, i.seedPrice]));
  const opens = new Map(prices);

  return function step(now = Date.now()): Tick[] {
    return instruments.map((instrument) => {
      const prev = prices.get(instrument.id) ?? instrument.seedPrice;
      const shock = (random() * 2 - 1) * instrument.volatility * 2;
      const pull = ((instrument.seedPrice - prev) / instrument.seedPrice) * 0.02;
      const price = Math.max(prev * (1 + shock + pull), instrument.seedPrice * 0.5);
      prices.set(instrument.id, price);
      return { id: instrument.id, price, open24h: opens.get(instrument.id), time: now };
    });
  };
}
