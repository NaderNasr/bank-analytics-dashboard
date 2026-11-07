/**
 * "Ways to save": pure rules that turn spending statistics into concrete, conservative savings
 * suggestions. Every estimate is a transparent formula on the customer's own numbers, so the UI
 * can show the evidence next to the saving. Amounts are minor units (fils).
 */

/** Services that do the same job; paying for two in one group is a likely saving. */
export const OVERLAPPING_SERVICES: Readonly<Record<string, "music" | "video">> = {
  Spotify: "music",
  "Anghami Plus": "music",
  Netflix: "video",
  "Shahid VIP": "video",
};

/** Assumptions behind the estimates, shown to the user as part of the evidence. */
export const SAVING_ASSUMPTIONS = {
  homeCoffeeCostMinor: 350, // a cup brewed at home, JOD 0.350
  coffeeShare: 0.5, // half of café visits replaced
  deliveryShare: 0.5, // half of delivery orders replaced
  homeCookingRatio: 0.4, // cooking costs ~40% of the delivered price
  rideShare: 1 / 3, // a third of rides by bus
  busFareMinor: 500, // JOD 0.500
  weekendPremiumCut: 0.5, // halve the extra a weekend day costs over a weekday
  weekendTrigger: 1.25, // only flag weekends that cost 25%+ more per day
  minMonthlySavingMinor: 2_000, // don't suggest anything worth less than JOD 2 a month
} as const;

export interface SpendingStats {
  /** Days in the analysed range. */
  days: number;
  /** Recurring charges by merchant: average charge and charges in the range. */
  subscriptions: { merchant: string; averageMinor: number; charges: number }[];
  coffee: { totalMinor: number; count: number };
  delivery: { totalMinor: number; count: number };
  rides: { totalMinor: number; count: number };
  fees: { foreignMinor: number; foreignCount: number; atmMinor: number; atmCount: number };
  /** Discretionary spending split by Jordanian weekend (Fri/Sat) and weekdays. */
  weekend: { weekendMinor: number; weekendDays: number; weekdayMinor: number; weekdayDays: number };
}

export type InsightId =
  "overlappingMusic" | "overlappingVideo" | "coffee" | "delivery" | "rides" | "fees" | "weekend";

export interface SavingsInsight {
  id: InsightId;
  monthlySavingMinor: number;
  /** Values for the explanation text (minor units for money, counts as numbers, names as text). */
  evidence: Record<string, number | string>;
  /** Explorer filters that show the transactions behind the insight. */
  link?: { category?: string; q?: string };
}

export interface SavingsReport {
  months: number;
  totalMonthlySavingMinor: number;
  insights: SavingsInsight[];
}

const DAYS_PER_MONTH = 30.44;
const WEEKEND_DAYS_PER_MONTH = (2 / 7) * DAYS_PER_MONTH;

export function buildSavingsReport(stats: SpendingStats): SavingsReport {
  const months = Math.max(stats.days / DAYS_PER_MONTH, 1 / DAYS_PER_MONTH);
  const perMonth = (minor: number) => Math.round(minor / months);
  const a = SAVING_ASSUMPTIONS;
  const insights: SavingsInsight[] = [];

  // 1. Two services that do the same job: keep the one you prefer, cancel the cheaper one.
  for (const group of ["music", "video"] as const) {
    const active = stats.subscriptions
      .filter((s) => OVERLAPPING_SERVICES[s.merchant] === group && s.charges > 0)
      .sort((x, y) => x.averageMinor - y.averageMinor);
    if (active.length >= 2) {
      const cheaper = active[0]!;
      insights.push({
        id: group === "music" ? "overlappingMusic" : "overlappingVideo",
        monthlySavingMinor: cheaper.averageMinor,
        evidence: {
          services: active.map((s) => s.merchant).join(" + "),
          cheaper: cheaper.merchant,
          monthlyTotalMinor: active.reduce((sum, s) => sum + s.averageMinor, 0),
        },
        link: { category: "subscriptions" },
      });
    }
  }

  // 2. Coffee shops: brew half of those coffees at home.
  if (stats.coffee.count > 0) {
    const replaced = stats.coffee.count * a.coffeeShare;
    const avgCup = stats.coffee.totalMinor / stats.coffee.count;
    const saving = perMonth(replaced * Math.max(avgCup - a.homeCoffeeCostMinor, 0));
    insights.push({
      id: "coffee",
      monthlySavingMinor: saving,
      evidence: {
        visitsPerMonth: Math.round(stats.coffee.count / months),
        monthlyMinor: perMonth(stats.coffee.totalMinor),
        averageMinor: Math.round(avgCup),
        homeCupMinor: a.homeCoffeeCostMinor,
      },
      link: { category: "coffee" },
    });
  }

  // 3. Food delivery: cook half of those meals instead.
  if (stats.delivery.count > 0) {
    const saving = perMonth(stats.delivery.totalMinor * a.deliveryShare * (1 - a.homeCookingRatio));
    insights.push({
      id: "delivery",
      monthlySavingMinor: saving,
      evidence: {
        ordersPerMonth: Math.round(stats.delivery.count / months),
        monthlyMinor: perMonth(stats.delivery.totalMinor),
      },
      link: { category: "dining" },
    });
  }

  // 4. Ride-hailing: take the bus for a third of trips.
  if (stats.rides.count > 0) {
    const avgRide = stats.rides.totalMinor / stats.rides.count;
    const saving = perMonth(
      stats.rides.count * a.rideShare * Math.max(avgRide - a.busFareMinor, 0),
    );
    insights.push({
      id: "rides",
      monthlySavingMinor: saving,
      evidence: {
        ridesPerMonth: Math.round(stats.rides.count / months),
        monthlyMinor: perMonth(stats.rides.totalMinor),
        averageMinor: Math.round(avgRide),
        busFareMinor: a.busFareMinor,
      },
      link: { category: "transport" },
    });
  }

  // 5. Avoidable fees: foreign-currency fees and other banks' ATMs.
  const avoidable = stats.fees.foreignMinor + stats.fees.atmMinor;
  if (avoidable > 0) {
    insights.push({
      id: "fees",
      monthlySavingMinor: perMonth(avoidable),
      evidence: {
        foreignCount: stats.fees.foreignCount,
        foreignMinor: stats.fees.foreignMinor,
        atmCount: stats.fees.atmCount,
        atmMinor: stats.fees.atmMinor,
      },
      link: { category: "fees" },
    });
  }

  // 6. Weekends that cost much more per day than weekdays: a budget that halves the premium.
  const { weekendMinor, weekendDays, weekdayMinor, weekdayDays } = stats.weekend;
  if (weekendDays > 0 && weekdayDays > 0) {
    const weekendDaily = weekendMinor / weekendDays;
    const weekdayDaily = weekdayMinor / weekdayDays;
    if (weekdayDaily > 0 && weekendDaily > weekdayDaily * a.weekendTrigger) {
      const target = weekdayDaily + (weekendDaily - weekdayDaily) * (1 - a.weekendPremiumCut);
      insights.push({
        id: "weekend",
        monthlySavingMinor: Math.round((weekendDaily - target) * WEEKEND_DAYS_PER_MONTH),
        evidence: {
          weekendDailyMinor: Math.round(weekendDaily),
          weekdayDailyMinor: Math.round(weekdayDaily),
          percentMore: Math.round((weekendDaily / weekdayDaily - 1) * 100),
          targetDailyMinor: Math.round(target),
        },
      });
    }
  }

  const kept = insights
    .filter((i) => i.monthlySavingMinor >= a.minMonthlySavingMinor)
    .sort((x, y) => y.monthlySavingMinor - x.monthlySavingMinor);
  return {
    months: Math.round(months * 10) / 10,
    totalMonthlySavingMinor: kept.reduce((sum, i) => sum + i.monthlySavingMinor, 0),
    insights: kept,
  };
}
