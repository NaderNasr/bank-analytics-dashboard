/** The Jordanian dinar is pegged to the US dollar: 1 JOD = 1.41044 USD (0.709 JOD per USD). */
export const USD_PER_JOD = 1.41044;

export type InstrumentKind = "crypto" | "metal" | "fx" | "index";
export type FeedSource = "live" | "simulated";

export interface Instrument {
  id: string;
  /** Coinbase product id for live instruments. */
  productId?: string;
  kind: InstrumentKind;
  /** Quote currency of `price`. */
  quote: "USD" | "JOD";
  /** Decimal places to show. */
  digits: number;
  /** Starting point for the simulated feed, and its per-tick volatility (fraction). */
  seedPrice: number;
  volatility: number;
}

export const INSTRUMENTS: readonly Instrument[] = [
  {
    id: "BTC",
    productId: "BTC-USD",
    kind: "crypto",
    quote: "USD",
    digits: 2,
    seedPrice: 98_000,
    volatility: 0.0012,
  },
  {
    id: "ETH",
    productId: "ETH-USD",
    kind: "crypto",
    quote: "USD",
    digits: 2,
    seedPrice: 3_400,
    volatility: 0.0015,
  },
  {
    id: "SOL",
    productId: "SOL-USD",
    kind: "crypto",
    quote: "USD",
    digits: 2,
    seedPrice: 180,
    volatility: 0.002,
  },
  {
    id: "XRP",
    productId: "XRP-USD",
    kind: "crypto",
    quote: "USD",
    digits: 4,
    seedPrice: 2.2,
    volatility: 0.002,
  },
  { id: "XAU", kind: "metal", quote: "USD", digits: 2, seedPrice: 2_650, volatility: 0.0004 },
  { id: "EURJOD", kind: "fx", quote: "JOD", digits: 4, seedPrice: 0.769, volatility: 0.00015 },
  { id: "GBPJOD", kind: "fx", quote: "JOD", digits: 4, seedPrice: 0.912, volatility: 0.00015 },
  { id: "ASE", kind: "index", quote: "JOD", digits: 2, seedPrice: 2_480, volatility: 0.0003 },
];

export const LIVE_PRODUCT_IDS = INSTRUMENTS.flatMap((i) => (i.productId ? [i.productId] : []));
export const instrumentByProduct = new Map(
  INSTRUMENTS.flatMap((i) => (i.productId ? [[i.productId, i] as const] : [])),
);
