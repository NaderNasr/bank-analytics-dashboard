"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertCircle, RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import type { Locale } from "@/i18n/routing";
import { formatDay } from "@/lib/format";

import { AccountsList } from "./accounts-list";
import { BalanceChart } from "./balance-chart";
import { CashFlowChart } from "./cash-flow-chart";
import { CategoryBreakdown } from "./category-breakdown";
import { KpiCards } from "./kpi-cards";
import { SavingsPanel } from "./savings-panel";
import { SpendingHeatmap } from "./spending-heatmap";
import { RANGE_OPTIONS, summaryQuery, type RangeMonths } from "./summary-query";
import { TopMerchants } from "./top-merchants";

export function OverviewDashboard() {
  const t = useTranslations("Overview");
  const locale = useLocale() as Locale;
  const [months, setMonths] = useState<RangeMonths>(12);
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...summaryQuery(months),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{t("title")}</h1>
          <p className="min-h-5 text-sm text-fg-muted">
            {data
              ? t("description", {
                  from: formatDay(data.range.from, locale),
                  to: formatDay(data.range.to, locale),
                })
              : null}
          </p>
          <span aria-hidden className="mt-2 h-0.5 w-16 rounded-full bg-gold-accent" />
        </div>
        <div
          role="group"
          aria-label={t("range.label")}
          className="inline-flex rounded-md border border-border bg-surface p-0.5 shadow-card"
        >
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMonths(option)}
              aria-pressed={months === option}
              title={t("range.monthsLong", { count: option })}
              className={`h-9 min-w-12 rounded-[5px] px-3 text-sm font-medium tabular transition-colors duration-150 ${
                months === option
                  ? "bg-primary text-on-primary"
                  : "text-fg-muted hover:bg-surface-muted hover:text-fg"
              }`}
            >
              {t("range.months", { count: option })}
            </button>
          ))}
        </div>
      </div>

      {error && !data ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg bg-negative-soft p-4 text-sm text-on-negative-soft"
        >
          <AlertCircle aria-hidden className="size-5 shrink-0" />
          <span className="flex-1">{t("error.title")}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-surface px-3 font-medium text-fg ring-1 ring-border-strong"
          >
            <RotateCw aria-hidden className="size-4" />
            {t("error.retry")}
          </button>
        </div>
      ) : null}

      {isPending ? (
        <DashboardSkeleton label={t("loading")} />
      ) : data ? (
        <div
          className={`flex flex-col gap-6 transition-opacity duration-200 ${isFetching ? "opacity-60" : ""}`}
          aria-busy={isFetching}
        >
          <KpiCards data={data} />
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <BalanceChart data={data} />
            </div>
            <AccountsList data={data} />
          </div>
          <CashFlowChart data={data} />
          <SpendingHeatmap data={data} />
          <SavingsPanel months={months} currency={data.currency} />
          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryBreakdown data={data} />
            <TopMerchants data={data} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DashboardSkeleton({ label }: { label: string }) {
  const block = "animate-pulse rounded-lg bg-surface-muted";
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`${block} h-28`} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className={`${block} h-80 xl:col-span-2`} />
        <div className={`${block} h-80`} />
      </div>
      <div className={`${block} h-48`} />
    </div>
  );
}
