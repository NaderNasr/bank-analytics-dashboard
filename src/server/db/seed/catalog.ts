/**
 * Static reference data for the seed: categories and a Jordan-flavoured merchant list.
 * Amounts are in JOD (major units); the generator converts to fils.
 */

export const CURRENCY = "JOD";

export type CategoryKind = "income" | "expense" | "transfer";

export const CATEGORIES = [
  // income
  { slug: "salary", kind: "income" },
  { slug: "interest", kind: "income" },
  { slug: "refunds", kind: "income" },
  // expense
  { slug: "rent", kind: "expense" },
  { slug: "groceries", kind: "expense" },
  { slug: "dining", kind: "expense" },
  { slug: "coffee", kind: "expense" },
  { slug: "transport", kind: "expense" },
  { slug: "fuel", kind: "expense" },
  { slug: "utilities", kind: "expense" },
  { slug: "telecom", kind: "expense" },
  { slug: "subscriptions", kind: "expense" },
  { slug: "shopping", kind: "expense" },
  { slug: "health", kind: "expense" },
  { slug: "entertainment", kind: "expense" },
  { slug: "travel", kind: "expense" },
  { slug: "education", kind: "expense" },
  { slug: "cash", kind: "expense" },
  { slug: "fees", kind: "expense" },
  // transfer
  { slug: "transfers", kind: "transfer" },
] as const satisfies readonly { slug: string; kind: CategoryKind }[];

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

/** Everyday merchants, picked at random each day. */
export interface DiscretionaryMerchant {
  name: string;
  category: CategorySlug;
  country: string;
  /** Relative pick frequency on a weekday. */
  weight: number;
  /** Multiplier applied to `weight` on Friday and Saturday (the Jordanian weekend). */
  weekendBoost: number;
  /** Price range in JOD. */
  min: number;
  max: number;
  /** Local hours (Asia/Amman) during which purchases happen, [from, to). */
  hours: readonly [number, number];
  online: boolean;
}

// prettier-ignore
export const DISCRETIONARY_MERCHANTS: readonly DiscretionaryMerchant[] = [
  // groceries
  { name: "Carrefour", category: "groceries", country: "JO", weight: 1.2, weekendBoost: 1.6, min: 8, max: 70, hours: [9, 23], online: false },
  { name: "C-Town", category: "groceries", country: "JO", weight: 3, weekendBoost: 1.2, min: 1.5, max: 20, hours: [8, 23], online: false },
  { name: "Safeway", category: "groceries", country: "JO", weight: 0.8, weekendBoost: 1.5, min: 5, max: 70, hours: [9, 23], online: false },
  { name: "Cozmo", category: "groceries", country: "JO", weight: 0.8, weekendBoost: 1.4, min: 4, max: 60, hours: [9, 23], online: false },
  { name: "Al Quds Bakery", category: "groceries", country: "JO", weight: 7, weekendBoost: 1.3, min: 0.35, max: 3, hours: [6, 12], online: false },
  { name: "Talabat Mart", category: "groceries", country: "JO", weight: 0.8, weekendBoost: 1.3, min: 5, max: 25, hours: [10, 24], online: true },
  { name: "Abu Jbara Mini Market", category: "groceries", country: "JO", weight: 9, weekendBoost: 1.2, min: 0.25, max: 4, hours: [7, 24], online: false },
  // coffee
  { name: "Starbucks", category: "coffee", country: "JO", weight: 4, weekendBoost: 1.1, min: 2.5, max: 6.5, hours: [7, 21], online: false },
  { name: "Caribou Coffee", category: "coffee", country: "JO", weight: 3, weekendBoost: 1.1, min: 2.5, max: 6, hours: [7, 21], online: false },
  { name: "Dimitri's Coffee", category: "coffee", country: "JO", weight: 6, weekendBoost: 0.9, min: 1.5, max: 4, hours: [7, 17], online: false },
  { name: "Al Rabih Coffee Cart", category: "coffee", country: "JO", weight: 6, weekendBoost: 1, min: 0.5, max: 1.5, hours: [6, 14], online: false },
  // dining
  { name: "Shawerma Reem", category: "dining", country: "JO", weight: 5, weekendBoost: 2.2, min: 1.5, max: 6, hours: [12, 24], online: false },
  { name: "Hashem Restaurant", category: "dining", country: "JO", weight: 1.5, weekendBoost: 2.5, min: 2, max: 10, hours: [8, 24], online: false },
  { name: "Habibah Sweets", category: "dining", country: "JO", weight: 2, weekendBoost: 2.8, min: 1, max: 6, hours: [10, 24], online: false },
  { name: "Sufra", category: "dining", country: "JO", weight: 0.15, weekendBoost: 3.5, min: 25, max: 90, hours: [13, 24], online: false },
  { name: "Fakhr El-Din", category: "dining", country: "JO", weight: 0.1, weekendBoost: 3.5, min: 30, max: 110, hours: [13, 24], online: false },
  { name: "Talabat", category: "dining", country: "JO", weight: 2.2, weekendBoost: 1.9, min: 5, max: 28, hours: [12, 24], online: true },
  { name: "Careem Food", category: "dining", country: "JO", weight: 1, weekendBoost: 1.8, min: 5, max: 25, hours: [12, 24], online: true },
  // transport and fuel
  { name: "Careem", category: "transport", country: "JO", weight: 6, weekendBoost: 1.4, min: 1.5, max: 6, hours: [7, 24], online: true },
  { name: "Uber", category: "transport", country: "JO", weight: 3, weekendBoost: 1.4, min: 1.5, max: 6, hours: [7, 24], online: true },
  { name: "Amman Bus", category: "transport", country: "JO", weight: 4, weekendBoost: 0.6, min: 0.35, max: 0.75, hours: [6, 22], online: false },
  { name: "Abdali Parking", category: "transport", country: "JO", weight: 3, weekendBoost: 1.3, min: 0.5, max: 3, hours: [8, 24], online: false },
  { name: "JETT", category: "transport", country: "JO", weight: 0.1, weekendBoost: 3, min: 4, max: 12, hours: [6, 18], online: false },
  { name: "Manaseer", category: "fuel", country: "JO", weight: 0.8, weekendBoost: 1.2, min: 15, max: 40, hours: [6, 23], online: false },
  { name: "Total Jordan", category: "fuel", country: "JO", weight: 0.5, weekendBoost: 1.2, min: 15, max: 40, hours: [6, 23], online: false },
  // shopping
  { name: "City Mall", category: "shopping", country: "JO", weight: 0.35, weekendBoost: 3, min: 10, max: 140, hours: [11, 23], online: false },
  { name: "Taj Mall", category: "shopping", country: "JO", weight: 0.3, weekendBoost: 3, min: 10, max: 160, hours: [11, 23], online: false },
  { name: "IKEA Amman", category: "shopping", country: "JO", weight: 0.08, weekendBoost: 3.5, min: 15, max: 250, hours: [10, 22], online: false },
  { name: "Amazon", category: "shopping", country: "US", weight: 0.3, weekendBoost: 1.2, min: 8, max: 90, hours: [0, 24], online: true },
  { name: "Noon", category: "shopping", country: "AE", weight: 0.3, weekendBoost: 1.2, min: 6, max: 70, hours: [0, 24], online: true },
  // health
  { name: "Pharmacy One", category: "health", country: "JO", weight: 1.5, weekendBoost: 1, min: 1.5, max: 25, hours: [9, 24], online: false },
  { name: "Al Khalidi Hospital", category: "health", country: "JO", weight: 0.04, weekendBoost: 0.5, min: 30, max: 180, hours: [9, 20], online: false },
  // entertainment
  { name: "Prime Cinemas", category: "entertainment", country: "JO", weight: 0.3, weekendBoost: 4, min: 6, max: 24, hours: [16, 24], online: false },
  { name: "Taj Cinemas", category: "entertainment", country: "JO", weight: 0.25, weekendBoost: 4, min: 6, max: 24, hours: [16, 24], online: false },
  { name: "Steam", category: "entertainment", country: "US", weight: 0.1, weekendBoost: 2, min: 3, max: 45, hours: [0, 24], online: true },
  // travel
  { name: "Royal Jordanian", category: "travel", country: "JO", weight: 0.03, weekendBoost: 1, min: 120, max: 650, hours: [0, 24], online: true },
  { name: "Booking.com", category: "travel", country: "NL", weight: 0.05, weekendBoost: 1, min: 60, max: 420, hours: [0, 24], online: true },
  // education
  { name: "Readers Bookshop", category: "education", country: "JO", weight: 0.2, weekendBoost: 2, min: 5, max: 40, hours: [10, 22], online: false },
  { name: "Coursera", category: "education", country: "US", weight: 0.03, weekendBoost: 1, min: 30, max: 60, hours: [0, 24], online: true },
];

/** Fixed monthly charges. `day` is the day of month the charge lands. */
export interface RecurringCharge {
  name: string;
  category: CategorySlug;
  country: string;
  day: number;
  /** JOD. A [min, max] pair varies the bill month to month. */
  amount: number | readonly [number, number];
  account: "current" | "card";
  channel: "direct_debit" | "online";
  /** Months (0–11) that cost more, e.g. electricity in summer and winter. */
  peakMonths?: readonly number[];
}

// prettier-ignore
export const RECURRING_CHARGES: readonly RecurringCharge[] = [
  { name: "Netflix", category: "subscriptions", country: "NL", day: 3, amount: 5.99, account: "card", channel: "online" },
  { name: "Spotify", category: "subscriptions", country: "SE", day: 9, amount: 3.49, account: "card", channel: "online" },
  { name: "Shahid VIP", category: "subscriptions", country: "AE", day: 14, amount: 4.5, account: "card", channel: "online" },
  { name: "Anghami Plus", category: "subscriptions", country: "AE", day: 17, amount: 2.99, account: "card", channel: "online" },
  { name: "iCloud", category: "subscriptions", country: "IE", day: 21, amount: 0.99, account: "card", channel: "online" },
  { name: "Fitness First", category: "subscriptions", country: "JO", day: 2, amount: 45, account: "current", channel: "direct_debit" },
  { name: "Zain", category: "telecom", country: "JO", day: 11, amount: [14, 24], account: "current", channel: "direct_debit" },
  { name: "Orange Fiber", category: "telecom", country: "JO", day: 6, amount: 30, account: "current", channel: "direct_debit" },
  { name: "JEPCO", category: "utilities", country: "JO", day: 15, amount: [22, 48], account: "current", channel: "direct_debit", peakMonths: [0, 1, 6, 7, 11] },
  { name: "Miyahuna", category: "utilities", country: "JO", day: 19, amount: [8, 18], account: "current", channel: "direct_debit", peakMonths: [5, 6, 7] },
];

export const AMMAN_AREAS = [
  "SHMEISANI",
  "ABDOUN",
  "SWEIFIEH",
  "KHALDA",
  "JABAL AMMAN",
  "ABDALI",
  "TLA AL ALI",
  "DABOUQ",
  "UM UTHAINA",
] as const;

export const EMPLOYER = "Petra Analytics LLC";
export const LANDLORD = "R. Khoury";
