/**
 * Coinbase Exchange public market data (no key): wss://ws-feed.exchange.coinbase.com,
 * "ticker" channel. Messages are untrusted input, so they are validated, not cast.
 */
export const COINBASE_WS_URL = "wss://ws-feed.exchange.coinbase.com";

export interface Tick {
  id: string;
  price: number;
  open24h?: number;
  high24h?: number;
  low24h?: number;
  time: number;
}

export function subscribeMessage(productIds: readonly string[]): string {
  return JSON.stringify({ type: "subscribe", product_ids: productIds, channels: ["ticker"] });
}

const num = (value: unknown): number | undefined => {
  const n = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** A ticker message → a tick for one of our instruments, or null for anything else. */
export function parseTicker(
  raw: unknown,
  productToId: (productId: string) => string | undefined,
): Tick | null {
  let msg: unknown = raw;
  if (typeof raw === "string") {
    try {
      msg = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof msg !== "object" || msg === null) return null;
  const m = msg as Record<string, unknown>;
  if (m.type !== "ticker" || typeof m.product_id !== "string") return null;
  const id = productToId(m.product_id);
  const price = num(m.price);
  if (!id || price === undefined) return null;
  const time = typeof m.time === "string" ? Date.parse(m.time) : NaN;
  return {
    id,
    price,
    open24h: num(m.open_24h),
    high24h: num(m.high_24h),
    low24h: num(m.low_24h),
    time: Number.isFinite(time) ? time : Date.now(),
  };
}
