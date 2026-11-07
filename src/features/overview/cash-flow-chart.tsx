"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { directionOf, type Locale } from "@/i18n/routing";
import type { SummaryResponse } from "@/lib/api/types";
import { toMajor } from "@/lib/money";
import { formatAmount, formatMonth } from "@/lib/format";

import { Panel } from "./panel";

const SERIES = [
  { key: "income", color: "var(--chart-1)" },
  { key: "spending", color: "var(--chart-2)" },
] as const;

/**
 * Grouped bars: two series on one axis, months on the x-axis. Mirrors in Arabic (months run
 * right-to-left, the value axis moves to the right). A legend names both series and a
 * screen-reader table carries the exact values.
 */
export function CashFlowChart({ data }: { data: SummaryResponse }) {
  const t = useTranslations("Overview.cashFlow");
  const locale = useLocale() as Locale;
  const rtl = directionOf(locale) === "rtl";
  const { currency } = data;

  const rows = data.cashFlow.map((m) => ({
    month: m.month,
    income: toMajor(m.incomeMinor, currency),
    spending: toMajor(m.spendingMinor, currency),
    incomeMinor: m.incomeMinor,
    spendingMinor: m.spendingMinor,
  }));

  return (
    <Panel
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <ul className="flex shrink-0 items-center gap-4 text-xs text-fg-muted">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
              {t(s.key)}
            </li>
          ))}
        </ul>
      }
    >
      {/* SVG text anchors follow the inherited direction, so the plot stays in LTR coordinates and
          is mirrored explicitly (reversed axis, value axis on the right) for Arabic. */}
      <div className="h-64" aria-hidden dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            barGap={2}
            barCategoryGap="24%"
            margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="month"
              reversed={rtl}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
              tickFormatter={(m: string) => formatMonth(m, locale)}
            />
            <YAxis
              // logical-properties: allow — Recharts takes a physical side; it follows the direction.
              orientation={rtl ? "right" : "left"}
              width={56}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
              tickFormatter={(v: number) =>
                new Intl.NumberFormat("en", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(v)
              }
            />
            <Tooltip
              cursor={{ fill: "var(--surface-muted)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as (typeof rows)[number];
                const net = row.incomeMinor - row.spendingMinor;
                return (
                  <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-overlay">
                    <p className="mb-1 font-semibold text-fg">
                      {formatMonth(String(label), locale, true)}
                    </p>
                    {SERIES.map((s) => (
                      <p
                        key={s.key}
                        className="flex items-center justify-between gap-6 text-fg-muted"
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className="size-2 rounded-sm"
                            style={{ background: s.color }}
                          />
                          {t(s.key)}
                        </span>
                        <bdi className="text-fg tabular">
                          {formatAmount(row[`${s.key}Minor`], currency, locale)}
                        </bdi>
                      </p>
                    ))}
                    <p className="mt-1 flex justify-between gap-6 border-t border-border pt-1 text-fg-muted">
                      {t("net")}
                      <bdi
                        className={`font-medium tabular ${net >= 0 ? "text-positive" : "text-negative"}`}
                      >
                        {formatAmount(net, currency, locale, { signed: true })}
                      </bdi>
                    </p>
                  </div>
                );
              }}
            />
            {SERIES.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{t("tableCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("title")}</th>
            <th scope="col">{t("income")}</th>
            <th scope="col">{t("spending")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <th scope="row">{formatMonth(r.month, locale, true)}</th>
              <td>{formatAmount(r.incomeMinor, currency, locale)}</td>
              <td>{formatAmount(r.spendingMinor, currency, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
