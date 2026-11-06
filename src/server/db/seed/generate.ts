import { Faker, en } from "@faker-js/faker";

import { DEMO_USER_EMAIL } from "@/lib/constants";
import { toMinor } from "@/lib/money";

import {
  AMMAN_AREAS,
  CURRENCY,
  DISCRETIONARY_MERCHANTS,
  EMPLOYER,
  LANDLORD,
  RECURRING_CHARGES,
  type CategorySlug,
  type DiscretionaryMerchant,
} from "./catalog";

/**
 * Deterministic data generator for the demo customer. Pure: no database, no clock. The same
 * options always produce the same rows, which keeps the demo stable and makes this testable.
 *
 * It simulates the customer day by day in Amman local time (UTC+3, no DST), keeping running
 * balances so that card purchases fail when the credit limit is reached, debit purchases fail on
 * insufficient funds, and savings top up the current account when it runs low.
 */

export interface SeedOptions {
  seed?: number;
  /** First local day after the simulated period, as "YYYY-MM-DD". */
  endDate?: string;
  months?: number;
}

export const DEFAULT_SEED_OPTIONS = {
  seed: 20_261_106,
  endDate: "2026-11-01",
  months: 18,
} as const satisfies Required<SeedOptions>;

type AccountKey = "current" | "savings" | "card";
type Direction = "debit" | "credit";
type Status = "pending" | "posted" | "failed" | "reversed";
type Channel = "card_present" | "online" | "transfer" | "direct_debit" | "standing_order" | "atm";

export interface SeedUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface SeedAccount {
  id: string;
  key: AccountKey;
  userId: string;
  type: AccountKey;
  name: string;
  maskedNumber: string;
  currency: string;
  openingBalanceMinor: number;
  creditLimitMinor: number | null;
  openedAt: Date;
}

export interface SeedMerchant {
  id: string;
  name: string;
  categorySlug: CategorySlug;
  country: string;
}

export interface SeedTransaction {
  id: string;
  accountId: string;
  amountMinor: number;
  currency: string;
  direction: Direction;
  status: Status;
  channel: Channel;
  categorySlug: CategorySlug;
  merchantId: string | null;
  description: string;
  reference: string;
  occurredAt: Date;
  postedAt: Date | null;
  transferGroupId: string | null;
  refundOfId: string | null;
}

export interface SeedData {
  user: SeedUser;
  accounts: SeedAccount[];
  merchants: SeedMerchant[];
  transactions: SeedTransaction[];
}

// ── Tunables ─────────────────────────────────────────────────────────────────

const AMMAN_UTC_OFFSET_HOURS = 3;
const WEEKDAY_PURCHASES = 17; // mean everyday purchases per weekday
const WEEKEND_PURCHASES = 28; // …and per Friday/Saturday
const ATM_DAILY_PROBABILITY = 0.12;
const RANDOM_DECLINE_RATE = 0.008;
const REVERSAL_RATE = 0.003;
const REFUND_RATE = 0.008;
const FOREIGN_FEE_RATE = 0.025;
const SALARY_JOD = 4_600;
const SALARY_AFTER_RAISE_JOD = 4_900;
const RENT_JOD = 450;
const MONTHLY_SAVINGS_JOD = 350;
const SAVINGS_RATE_APR = 0.0275;
const CARD_LIMIT_JOD = 5_000;
const CARD_ANNUAL_FEE_JOD = 25;
const LOW_BALANCE_JOD = 400;
const CURRENT_ACCOUNT_BUFFER_JOD = 4_200;
const TOP_UP_JOD = 1_000;
const PENDING_WINDOW_DAYS = 2;

const jod = (major: number) => toMinor(major, CURRENCY);

// ── Calendar helpers (local days are represented as UTC midnight of that date) ──

const DAY_MS = 86_400_000;

function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function addMonths(day: Date, months: number): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + months, day.getUTCDate()));
}

function daysInMonth(day: Date): number {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate();
}

/** Jordan's weekend is Friday and Saturday. */
function isWeekend(day: Date): boolean {
  const dow = day.getUTCDay();
  return dow === 5 || dow === 6;
}

/** Local wall-clock time in Amman → UTC instant. */
function localTime(day: Date, hour: number, minute: number, second: number): Date {
  return new Date(
    day.getTime() + ((hour - AMMAN_UTC_OFFSET_HOURS) * 60 + minute) * 60_000 + second * 1_000,
  );
}

// ── Generator ────────────────────────────────────────────────────────────────

interface PlannedEvent {
  at: Date;
  account: AccountKey;
  amountMinor: number;
  direction: Direction;
  channel: Channel;
  category: CategorySlug;
  merchantId: string | null;
  description: string;
  transferGroupId?: string;
  refundOfId?: string;
  /** Card purchases can be declined; bank-initiated entries cannot. */
  declinable: boolean;
  foreign?: boolean;
  /** Resolved at processing time, e.g. card repayment = outstanding balance. */
  resolveAmount?: () => number;
}

export function generateSeedData(options: SeedOptions = {}): SeedData {
  const { seed, endDate, months } = { ...DEFAULT_SEED_OPTIONS, ...options };
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  const rand = () => faker.number.float({ min: 0, max: 1 });

  const end = parseDay(endDate);
  const start = addMonths(end, -months);
  const pendingFrom = end.getTime() - PENDING_WINDOW_DAYS * DAY_MS;

  // ── Customer and accounts ──
  const user: SeedUser = {
    id: faker.string.uuid(),
    email: DEMO_USER_EMAIL,
    name: "Layla Haddad",
    createdAt: addMonths(start, -30),
  };

  const masked = () => `•••• ${faker.string.numeric(4)}`;
  const makeAccount = (
    key: AccountKey,
    name: string,
    openingJod: number,
    limitJod: number | null,
    openedMonthsBefore: number,
  ): SeedAccount => ({
    id: faker.string.uuid(),
    key,
    userId: user.id,
    type: key,
    name,
    maskedNumber: masked(),
    currency: CURRENCY,
    openingBalanceMinor: jod(openingJod),
    creditLimitMinor: limitJod === null ? null : jod(limitJod),
    openedAt: addMonths(start, -openedMonthsBefore),
  });

  const accounts: SeedAccount[] = [
    makeAccount("current", "Everyday Current", 1_850, null, 30),
    makeAccount("savings", "Goal Saver", 9_500, null, 28),
    makeAccount("card", "Platinum Card", 0, CARD_LIMIT_JOD, 20),
  ];
  const accountByKey = Object.fromEntries(accounts.map((a) => [a.key, a])) as Record<
    AccountKey,
    SeedAccount
  >;
  const balance: Record<AccountKey, number> = {
    current: accountByKey.current.openingBalanceMinor,
    savings: accountByKey.savings.openingBalanceMinor,
    card: accountByKey.card.openingBalanceMinor,
  };

  // ── Merchants ──
  const merchants: SeedMerchant[] = [];
  const merchantIdByName = new Map<string, string>();
  for (const m of [...DISCRETIONARY_MERCHANTS, ...RECURRING_CHARGES]) {
    const id = faker.string.uuid();
    merchants.push({ id, name: m.name, categorySlug: m.category, country: m.country });
    merchantIdByName.set(m.name, id);
  }
  const merchantId = (name: string) => merchantIdByName.get(name) ?? null;

  // ── Helpers ──
  const transactions: SeedTransaction[] = [];
  const future = new Map<number, PlannedEvent[]>();
  let referenceSeq = 0;

  const schedule = (dayMs: number, event: PlannedEvent) => {
    const list = future.get(dayMs) ?? [];
    list.push(event);
    future.set(dayMs, list);
  };

  const randomTime = (day: Date, [from, to]: readonly [number, number]) => {
    const minutes = Math.floor((from + rand() * (to - from)) * 60);
    return localTime(day, Math.floor(minutes / 60), minutes % 60, Math.floor(rand() * 60));
  };

  /** Prices cluster towards the low end of the range; rounded to 50 fils. */
  const priceMinor = (min: number, max: number) => {
    const major = min + (max - min) * rand() ** 1.8;
    return Math.max(50, Math.round(jod(major) / 50) * 50);
  };

  const poisson = (mean: number) => {
    const limit = Math.exp(-mean);
    let k = 0;
    let p = 1;
    do {
      k += 1;
      p *= rand();
    } while (p > limit);
    return k - 1;
  };

  const pickWeighted = <T>(items: readonly T[], weight: (item: T) => number): T => {
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    let r = rand() * total;
    for (const item of items) {
      r -= weight(item);
      if (r <= 0) return item;
    }
    return items[items.length - 1] as T;
  };

  const reference = (at: Date) => {
    referenceSeq += 1;
    const ymd = at.toISOString().slice(2, 10).replaceAll("-", "");
    return `FT${ymd}${String(referenceSeq).padStart(6, "0")}`;
  };

  const available = (key: AccountKey) =>
    key === "card" ? balance.card + (accountByKey.card.creditLimitMinor ?? 0) : balance[key];

  const record = (event: PlannedEvent): SeedTransaction => {
    const amountMinor = event.resolveAmount ? event.resolveAmount() : event.amountMinor;
    const isCardLike = event.channel === "card_present" || event.channel === "online";

    let status: Status = "posted";
    if (event.declinable) {
      const insufficient = event.direction === "debit" && amountMinor > available(event.account);
      if (insufficient || rand() < RANDOM_DECLINE_RATE) status = "failed";
      else if (isCardLike && event.at.getTime() >= pendingFrom) status = "pending";
      else if (rand() < REVERSAL_RATE) status = "reversed";
    }

    const postedAt =
      status === "posted" || status === "reversed"
        ? new Date(event.at.getTime() + (isCardLike ? (1 + Math.floor(rand() * 2)) * DAY_MS : 0))
        : null;

    if (status === "posted") {
      balance[event.account] += event.direction === "credit" ? amountMinor : -amountMinor;
    }

    const txn: SeedTransaction = {
      id: faker.string.uuid(),
      accountId: accountByKey[event.account].id,
      amountMinor,
      currency: CURRENCY,
      direction: event.direction,
      status,
      channel: event.channel,
      categorySlug: event.category,
      merchantId: event.merchantId,
      description: event.description,
      reference: reference(event.at),
      occurredAt: event.at,
      postedAt,
      transferGroupId: event.transferGroupId ?? null,
      refundOfId: event.refundOfId ?? null,
    };
    transactions.push(txn);
    return txn;
  };

  const transfer = (
    at: Date,
    from: AccountKey,
    to: AccountKey,
    amountMinor: number | (() => number),
    descriptions: { from: string; to: string },
  ): PlannedEvent[] => {
    const transferGroupId = faker.string.uuid();
    // Both legs share one resolved amount.
    let resolved: number | undefined;
    const resolve = () =>
      (resolved ??= typeof amountMinor === "function" ? amountMinor() : amountMinor);
    const common = {
      at,
      amountMinor: 0,
      channel: "transfer" as const,
      category: "transfers" as const,
      merchantId: null,
      declinable: false,
      transferGroupId,
      resolveAmount: resolve,
    };
    return [
      { ...common, account: from, direction: "debit", description: descriptions.from },
      { ...common, account: to, direction: "credit", description: descriptions.to },
    ];
  };

  const purchaseDescription = (m: DiscretionaryMerchant) => {
    const name = m.name.toUpperCase();
    if (m.online) return m.country === "JO" ? `${name} ONLINE AMMAN JO` : `${name} ${m.country}`;
    return `${name} ${faker.helpers.arrayElement(AMMAN_AREAS)} AMMAN JO`;
  };

  // ── Day-by-day simulation ──
  for (let dayMs = start.getTime(); dayMs < end.getTime(); dayMs += DAY_MS) {
    const day = new Date(dayMs);
    const dom = day.getUTCDate();
    const month = day.getUTCMonth();
    const monthIndex =
      (day.getUTCFullYear() - start.getUTCFullYear()) * 12 + month - start.getUTCMonth();
    const lastDayOfMonth = dom === daysInMonth(day);
    const events: PlannedEvent[] = [...(future.get(dayMs) ?? [])];
    future.delete(dayMs);

    // Salary on the 25th, moved back to Thursday when it falls on the weekend.
    const salaryDay = (() => {
      const d = new Date(Date.UTC(day.getUTCFullYear(), month, 25));
      while (isWeekend(d)) d.setUTCDate(d.getUTCDate() - 1);
      return d.getUTCDate();
    })();
    if (dom === salaryDay) {
      events.push({
        at: localTime(day, 7, 30, 0),
        account: "current",
        amountMinor: jod(monthIndex >= 12 ? SALARY_AFTER_RAISE_JOD : SALARY_JOD),
        direction: "credit",
        channel: "transfer",
        category: "salary",
        merchantId: null,
        description: `SALARY ${EMPLOYER.toUpperCase()}`,
        declinable: false,
      });
    }

    if (dom === 1) {
      events.push({
        at: localTime(day, 6, 0, 0),
        account: "current",
        amountMinor: jod(RENT_JOD),
        direction: "debit",
        channel: "standing_order",
        category: "rent",
        merchantId: null,
        description: `STANDING ORDER RENT ${LANDLORD.toUpperCase()}`,
        declinable: false,
      });
    }

    if (dom === 26) {
      events.push(
        // Fixed monthly saving, plus a sweep of anything above the buffer the day after payday.
        ...transfer(
          localTime(day, 9, 0, 0),
          "current",
          "savings",
          () =>
            Math.max(jod(MONTHLY_SAVINGS_JOD), balance.current - jod(CURRENT_ACCOUNT_BUFFER_JOD)),
          {
            from: "TRANSFER TO GOAL SAVER",
            to: "TRANSFER FROM EVERYDAY CURRENT",
          },
        ),
      );
    }

    // Card statement paid in full from the current account on the 5th.
    if (dom === 5) {
      events.push(
        ...transfer(localTime(day, 10, 0, 0), "current", "card", () => Math.max(0, -balance.card), {
          from: "CARD REPAYMENT PLATINUM CARD",
          to: "PAYMENT RECEIVED - THANK YOU",
        }),
      );
    }

    if (lastDayOfMonth) {
      events.push({
        at: localTime(day, 23, 50, 0),
        account: "savings",
        amountMinor: 0,
        resolveAmount: () =>
          Math.max(1, Math.round((balance.savings * SAVINGS_RATE_APR) / 12 / 10) * 10),
        direction: "credit",
        channel: "transfer",
        category: "interest",
        merchantId: null,
        description: "INTEREST CREDIT",
        declinable: false,
      });
    }

    // Annual card fee on the card's opening anniversary.
    const cardOpened = accountByKey.card.openedAt;
    if (month === cardOpened.getUTCMonth() && dom === cardOpened.getUTCDate()) {
      events.push({
        at: localTime(day, 3, 0, 0),
        account: "card",
        amountMinor: jod(CARD_ANNUAL_FEE_JOD),
        direction: "debit",
        channel: "transfer",
        category: "fees",
        merchantId: null,
        description: "ANNUAL CARD FEE",
        declinable: false,
      });
    }

    for (const charge of RECURRING_CHARGES) {
      if (dom !== charge.day) continue;
      const amountMinor = Array.isArray(charge.amount)
        ? (() => {
            const [min, max] = charge.amount as readonly [number, number];
            const peak = charge.peakMonths?.includes(month) ? 1.6 : 1;
            return Math.round(jod((min + rand() * (max - min)) * peak) / 10) * 10;
          })()
        : jod(charge.amount as number);
      events.push({
        at: localTime(day, 4, Math.floor(rand() * 60), 0),
        account: charge.account,
        amountMinor,
        direction: "debit",
        channel: charge.channel,
        category: charge.category,
        merchantId: merchantId(charge.name),
        description:
          charge.channel === "online"
            ? `${charge.name.toUpperCase()} ${charge.country}`
            : `DIRECT DEBIT ${charge.name.toUpperCase()}`,
        declinable: charge.account === "card",
        foreign: charge.country !== "JO",
      });
    }

    // Everyday purchases: more of them, and pricier ones, at the weekend.
    const weekend = isWeekend(day);
    const purchases = poisson(weekend ? WEEKEND_PURCHASES : WEEKDAY_PURCHASES);
    for (let i = 0; i < purchases; i += 1) {
      const m = pickWeighted(DISCRETIONARY_MERCHANTS, (x) =>
        weekend ? x.weight * x.weekendBoost : x.weight,
      );
      const onCard = rand() < (m.online ? 0.85 : 0.55);
      events.push({
        at: randomTime(day, m.hours),
        account: onCard ? "card" : "current",
        amountMinor: priceMinor(m.min, m.max),
        direction: "debit",
        channel: m.online ? "online" : "card_present",
        category: m.category,
        merchantId: merchantId(m.name),
        description: purchaseDescription(m),
        declinable: true,
        foreign: m.country !== "JO",
      });
    }

    if (rand() < ATM_DAILY_PROBABILITY) {
      const area = faker.helpers.arrayElement(AMMAN_AREAS);
      const at = randomTime(day, [8, 23]);
      events.push({
        at,
        account: "current",
        amountMinor: jod(20 + Math.floor(rand() ** 2 * 9) * 10),
        direction: "debit",
        channel: "atm",
        category: "cash",
        merchantId: null,
        description: `ATM WITHDRAWAL ${area}`,
        declinable: true,
      });
      if (rand() < 0.3) {
        events.push({
          at: new Date(at.getTime() + 1_000),
          account: "current",
          amountMinor: jod(0.5),
          direction: "debit",
          channel: "atm",
          category: "fees",
          merchantId: null,
          description: `ATM FEE OFF-NETWORK ${area}`,
          declinable: false,
        });
      }
    }

    // Move money from savings before the current account runs dry.
    if (balance.current < jod(LOW_BALANCE_JOD) && balance.savings > jod(TOP_UP_JOD)) {
      events.push(
        ...transfer(localTime(day, 0, 5, 0), "savings", "current", jod(TOP_UP_JOD), {
          from: "TRANSFER TO EVERYDAY CURRENT",
          to: "TRANSFER FROM GOAL SAVER",
        }),
      );
    }

    events.sort((a, b) => a.at.getTime() - b.at.getTime());

    for (const event of events) {
      const txn = record(event);
      if (txn.status !== "posted" || event.direction !== "debit") continue;

      if (event.foreign && event.account === "card") {
        record({
          at: new Date(event.at.getTime() + 1_000),
          account: "card",
          amountMinor: Math.max(10, Math.round((txn.amountMinor * FOREIGN_FEE_RATE) / 10) * 10),
          direction: "debit",
          channel: "transfer",
          category: "fees",
          merchantId: null,
          description: `FOREIGN TRANSACTION FEE ${event.description}`,
          declinable: false,
        });
      }

      const refundable =
        event.declinable &&
        (event.category === "shopping" ||
          event.category === "dining" ||
          event.category === "travel");
      if (refundable && rand() < REFUND_RATE) {
        const delayDays = 2 + Math.floor(rand() * 9);
        const refundDay = dayMs + delayDays * DAY_MS;
        if (refundDay < end.getTime()) {
          const partial = rand() < 0.3;
          schedule(refundDay, {
            at: randomTime(new Date(refundDay), [9, 18]),
            account: event.account,
            amountMinor: partial
              ? Math.max(50, Math.round((txn.amountMinor * (0.2 + rand() * 0.5)) / 50) * 50)
              : txn.amountMinor,
            direction: "credit",
            channel: event.channel,
            category: "refunds",
            merchantId: event.merchantId,
            description: `REFUND ${event.description}`,
            refundOfId: txn.id,
            declinable: false,
          });
        }
      }
    }
  }

  // Zero-amount legs can occur if the card was already paid off; they are not real movements.
  const kept = transactions.filter((t) => t.amountMinor > 0);
  const droppedGroups = new Set(
    transactions
      .filter((t) => t.amountMinor <= 0 && t.transferGroupId)
      .map((t) => t.transferGroupId),
  );

  return {
    user,
    accounts,
    merchants,
    transactions: kept.filter((t) => !t.transferGroupId || !droppedGroups.has(t.transferGroupId)),
  };
}
