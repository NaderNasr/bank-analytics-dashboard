"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { directionOf, type Locale } from "@/i18n/routing";
import type { SummaryResponse } from "@/lib/api/types";
import { formatAmount, formatDay, formatMonth, intlLocale } from "@/lib/format";

import { buildCalendar, HEAT_LEVELS } from "./calendar";
import { Panel } from "./panel";

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LABEL_W = 30;
const LABEL_H = 18;
const WEEKDAY_ROWS = [1, 3, 5]; // Mon, Wed, Fri

/**
 * Calendar heatmap of daily spending. Layout comes from D3 (quantized square-root scale, see
 * calendar.ts); React renders the SVG. Columns are weeks running inline-start → inline-end, so
 * time flows right-to-left in Arabic. One-hue sequential ramp with a "Less → More" legend; the
 * busiest days are also listed as text.
 */
export function SpendingHeatmap({ data }: { data: SummaryResponse }) {
  const t = useTranslations("Overview.heatmap");
  const locale = useLocale() as Locale;
  const rtl = directionOf(locale) === "rtl";
  const layout = useMemo(
    () => buildCalendar(data.dailySpending, data.range.from, data.range.to),
    [data.dailySpending, data.range.from, data.range.to],
  );
  const [hover, setHover] = useState<number | null>(null);

  const width = LABEL_W + layout.weeks * STEP;
  const height = LABEL_H + 7 * STEP;
  const x = (week: number) =>
    rtl ? width - LABEL_W - (week + 1) * STEP + GAP : LABEL_W + week * STEP;
  const weekdayName = (weekday: number) =>
    new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(2026, 1, 1 + weekday)), // 2026-02-01 is a Sunday
    );

  const money = (minor: number) => formatAmount(minor, data.currency, locale);
  const busiest = [...layout.cells].sort((a, b) => b.amountMinor - a.amountMinor).slice(0, 3);
  const hovered = hover === null ? null : layout.cells[hover];

  return (
    <Panel
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-fg-muted" aria-hidden>
          {t("less")}
          {Array.from({ length: HEAT_LEVELS + 1 }, (_, level) => (
            <span
              key={level}
              className="size-3 rounded-[3px]"
              style={{ background: `var(--heat-${level})` }}
            />
          ))}
          {t("more")}
        </div>
      }
    >
      <div
        className={`relative overflow-x-auto ${rtl ? "flex justify-end" : ""}`}
        onMouseLeave={() => setHover(null)}
        dir="ltr"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="block max-w-none"
          role="img"
          aria-label={`${t("title")}. ${t("summary", { days: busiest.map((c) => `${formatDay(c.date, locale)} (${money(c.amountMinor)})`).join("، ") })}`}
          data-testid="heatmap"
        >
          {layout.monthStarts.map(({ month, week }) => (
            <text
              key={month}
              x={rtl ? x(week) + CELL : x(week)}
              y={11}
              textAnchor={rtl ? "end" : "start"}
              className="fill-fg-muted text-[10px]"
            >
              {formatMonth(month, locale)}
            </text>
          ))}
          {WEEKDAY_ROWS.map((weekday) => (
            <text
              key={weekday}
              x={rtl ? width - 2 : 0}
              y={LABEL_H + weekday * STEP + CELL - 2}
              textAnchor={rtl ? "end" : "start"}
              className="fill-fg-muted text-[10px]"
            >
              {weekdayName(weekday)}
            </text>
          ))}
          {layout.cells.map((cell, i) => (
            <rect
              key={cell.date}
              data-level={cell.level}
              x={x(cell.week)}
              y={LABEL_H + cell.weekday * STEP}
              width={CELL}
              height={CELL}
              rx={3}
              fill={`var(--heat-${cell.level})`}
              stroke={hover === i ? "var(--fg)" : "none"}
              strokeWidth={1.5}
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
        {hovered ? (
          <div
            role="status"
            dir={rtl ? "rtl" : "ltr"}
            className="pointer-events-none absolute top-0 z-10 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap text-fg shadow-overlay"
            style={{
              insetInlineStart: Math.min(x(hovered.week), Math.max(width - 240, 0)),
              transform: `translateY(${LABEL_H + hovered.weekday * STEP - 34}px)`,
            }}
          >
            {hovered.amountMinor > 0
              ? t("cell", {
                  day: formatDay(hovered.date, locale),
                  amount: money(hovered.amountMinor),
                  count: hovered.count,
                })
              : `${formatDay(hovered.date, locale)}: ${t("noSpending")}`}
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-fg-muted">
        {t("summary", {
          days: busiest.map((c) => formatDay(c.date, locale)).join(locale === "ar" ? "، " : ", "),
        })}
      </p>
    </Panel>
  );
}
