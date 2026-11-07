import type { FeedSource } from "./instruments";
import type { Tick } from "./coinbase";

export const HISTORY_LENGTH = 90;

export interface Quote {
  id: string;
  price: number;
  open: number;
  high: number;
  low: number;
  /** Most recent prices, oldest first, for the sparkline. */
  history: number[];
  /** Direction of the last change, for the flash. */
  move: "up" | "down" | "flat";
  updatedAt: number;
  source: FeedSource;
}

export type Quotes = Readonly<Record<string, Quote>>;

/**
 * Applies a batch of ticks. Pure, so the board can buffer fast feeds and apply them a few times a
 * second instead of re-rendering on every trade.
 */
export function applyTicks(quotes: Quotes, ticks: readonly Tick[], source: FeedSource): Quotes {
  if (ticks.length === 0) return quotes;
  const next: Record<string, Quote> = { ...quotes };
  for (const tick of ticks) {
    const prev = next[tick.id];
    const open = tick.open24h ?? prev?.open ?? tick.price;
    const history = [...(prev?.history ?? []), tick.price].slice(-HISTORY_LENGTH);
    next[tick.id] = {
      id: tick.id,
      price: tick.price,
      open,
      high: tick.high24h ?? Math.max(prev?.high ?? tick.price, tick.price),
      low: tick.low24h ?? Math.min(prev?.low ?? tick.price, tick.price),
      history,
      move:
        !prev || prev.price === tick.price
          ? (prev?.move ?? "flat")
          : tick.price > prev.price
            ? "up"
            : "down",
      updatedAt: tick.time,
      source,
    };
  }
  return next;
}

export function changeFromOpen(quote: Quote): number {
  return quote.open > 0 ? (quote.price - quote.open) / quote.open : 0;
}
