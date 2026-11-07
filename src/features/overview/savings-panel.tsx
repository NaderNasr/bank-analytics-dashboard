"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  Car,
  Coffee,
  type LucideIcon,
  Music,
  PiggyBank,
  Receipt,
  Tv,
  UtensilsCrossed,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { getJson } from "@/components/providers/query-provider";
import { useCountUp } from "@/hooks/use-count-up";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { InsightsResponse } from "@/lib/api/types";
import { formatAmount } from "@/lib/format";
import { SAVING_ASSUMPTIONS, type InsightId, type SavingsInsight } from "@/lib/insights";

import { Panel } from "./panel";
import type { RangeMonths } from "./summary-query";

const ICONS: Record<InsightId, LucideIcon> = {
  overlappingMusic: Music,
  overlappingVideo: Tv,
  coffee: Coffee,
  delivery: UtensilsCrossed,
  rides: Car,
  fees: Receipt,
  weekend: CalendarDays,
};

export function insightsQuery(months: RangeMonths) {
  return {
    queryKey: ["insights", { months }] as const,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      getJson<InsightsResponse>(`/api/insights?months=${months}`, signal),
  };
}

/**
 * Turns evidence into message values: `*Minor` keys become formatted amounts under the key
 * without the suffix (monthlyMinor → monthly), everything else passes through.
 */
function messageValues(evidence: SavingsInsight["evidence"], money: (minor: number) => string) {
  return Object.fromEntries(
    Object.entries(evidence).map(([key, value]) =>
      key.endsWith("Minor") && typeof value === "number"
        ? [key.slice(0, -"Minor".length), money(value)]
        : [key, value],
    ),
  );
}

/**
 * "Ways to save": concrete suggestions computed from the customer's own transactions, each with
 * its evidence, an estimated monthly and yearly saving, and a link to the transactions behind it.
 */
export function SavingsPanel({ months, currency }: { months: RangeMonths; currency: string }) {
  const t = useTranslations("Overview.savings");
  const locale = useLocale() as Locale;
  const { data, isPending, isError } = useQuery(insightsQuery(months));

  const money = (minor: number) => formatAmount(minor, currency, locale);
  const whole = (minor: number) => formatAmount(minor, currency, locale, { whole: true });

  return (
    <Panel title={t("title")} subtitle={t("subtitle")}>
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-surface-muted" />
          ))}
        </div>
      ) : isError || !data ? (
        <p role="alert" className="text-sm text-negative">
          {t("error")}
        </p>
      ) : data.insights.length === 0 ? (
        <p className="text-sm text-fg-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-5" data-testid="savings">
          <div className="flex items-center gap-3 rounded-lg bg-gold-soft p-4 text-on-gold-soft">
            <PiggyBank aria-hidden className="size-8 shrink-0 animate-spin-in" />
            <div>
              <p className="text-base font-semibold">
                <CountedTotal
                  minor={data.totalMonthlySavingMinor}
                  render={(m) => t("total", { monthly: whole(m) })}
                />
              </p>
              <p className="text-sm">
                <bdi>{t("totalYear", { yearly: whole(data.totalMonthlySavingMinor * 12) })}</bdi>
              </p>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.insights.map((insight) => {
              const Icon = ICONS[insight.id];
              return (
                <li
                  key={insight.id}
                  data-testid={`saving-${insight.id}`}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-primary">
                      <Icon aria-hidden className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-fg">
                        {t(`items.${insight.id}.title`)}
                      </h3>
                      <p className="text-sm font-semibold text-positive">
                        <bdi className="tabular">
                          {t("perMonth", { amount: whole(insight.monthlySavingMinor) })}
                        </bdi>
                        <span className="block text-xs font-medium text-fg-muted">
                          <bdi className="tabular">
                            {t("perYear", { amount: whole(insight.monthlySavingMinor * 12) })}
                          </bdi>
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-fg-muted">
                    {t(`items.${insight.id}.body`, messageValues(insight.evidence, money))}
                  </p>
                  {insight.link ? (
                    <Link
                      href={{ pathname: "/transactions", query: insight.link }}
                      className="group mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {t("seeTransactions")}
                      <ArrowUpRight
                        aria-hidden
                        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                      />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <details className="text-xs text-fg-muted">
            <summary className="cursor-pointer font-medium">{t("howTitle")}</summary>
            <p className="mt-2">
              {t("how", {
                homeCup: money(SAVING_ASSUMPTIONS.homeCoffeeCostMinor),
                busFare: money(SAVING_ASSUMPTIONS.busFareMinor),
                min: money(SAVING_ASSUMPTIONS.minMonthlySavingMinor),
              })}
            </p>
          </details>
        </div>
      )}
    </Panel>
  );
}

function CountedTotal({ minor, render }: { minor: number; render: (minor: number) => string }) {
  const shown = useCountUp(minor, { fromZero: true, durationMs: 800 });
  return <bdi>{render(Math.round(shown))}</bdi>;
}
