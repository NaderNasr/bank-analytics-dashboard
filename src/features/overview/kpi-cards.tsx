"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { Locale } from "@/i18n/routing";
import type { SummaryResponse } from "@/lib/api/types";
import { formatAmount, formatPercent, relativeChange } from "@/lib/format";

type Direction = "higher-is-better" | "lower-is-better";

interface Delta {
  text: string;
  /** Whether the change is good for the customer; null when flat or not comparable. */
  good: boolean | null;
  up: boolean | null;
}

export function deltaFor(change: number | null, direction: Direction): Omit<Delta, "text"> {
  if (change === null || Math.abs(change) < 0.0005) return { good: null, up: null };
  const up = change > 0;
  return { up, good: direction === "higher-is-better" ? up : !up };
}

function DeltaBadge({ delta, label }: { delta: Delta; label: string }) {
  const t = useTranslations("Overview.kpi");
  const Icon = delta.up === null ? Minus : delta.up ? ArrowUpRight : ArrowDownRight;
  const tone =
    delta.good === null ? "text-fg-muted" : delta.good ? "text-positive" : "text-negative";
  return (
    <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${tone}`}>
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span className="tabular">{label}</span>
      {delta.good !== null ? (
        <span className="sr-only">({t(delta.good ? "better" : "worse")})</span>
      ) : null}
    </p>
  );
}

function Tile({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: Delta;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <p className="text-sm font-medium text-fg-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-fg tabular" dir="ltr">
        <bdi>{value}</bdi>
      </p>
      {delta ? <DeltaBadge delta={delta} label={delta.text} /> : null}
      {hint ? <p className="mt-2 text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}

/** Four headline numbers: hero tiles rather than charts, each compared with the previous period. */
export function KpiCards({ data }: { data: SummaryResponse }) {
  const t = useTranslations("Overview.kpi");
  const locale = useLocale() as Locale;
  const { kpis, previousKpis: prev, currency } = data;

  const money = (minor: number) => formatAmount(minor, currency, locale);
  const pct = (change: number | null) =>
    change === null
      ? t("noComparison")
      : t("vsPrevious", { change: formatPercent(change, locale, { signed: true }) });

  const incomeChange = prev ? relativeChange(kpis.incomeMinor, prev.incomeMinor) : null;
  const spendingChange = prev ? relativeChange(kpis.spendingMinor, prev.spendingMinor) : null;
  const rateChange =
    prev && kpis.savingsRate !== null && prev.savingsRate !== null
      ? kpis.savingsRate - prev.savingsRate
      : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="kpis">
      <Tile
        label={t("balance")}
        value={money(data.balances.totalMinor)}
        hint={t("balanceHint", { count: data.balances.accounts.length })}
      />
      <Tile
        label={t("income")}
        value={money(kpis.incomeMinor)}
        delta={{ text: pct(incomeChange), ...deltaFor(incomeChange, "higher-is-better") }}
      />
      <Tile
        label={t("spending")}
        value={money(kpis.spendingMinor)}
        delta={{ text: pct(spendingChange), ...deltaFor(spendingChange, "lower-is-better") }}
      />
      <Tile
        label={t("savingsRate")}
        value={kpis.savingsRate === null ? "—" : formatPercent(kpis.savingsRate, locale)}
        delta={{
          text:
            rateChange === null
              ? t("noComparison")
              : t("vsPrevious", {
                  change: t("points", {
                    change: new Intl.NumberFormat("en", {
                      signDisplay: "exceptZero",
                      maximumFractionDigits: 1,
                    }).format(rateChange * 100),
                  }),
                }),
          ...deltaFor(rateChange, "higher-is-better"),
        }}
      />
    </div>
  );
}
