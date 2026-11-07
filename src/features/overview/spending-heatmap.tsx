"use client";

import { range } from "d3-array";
import { scaleBand } from "d3-scale";
import { select } from "d3-selection";
import "d3-transition";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { directionOf, type Locale } from "@/i18n/routing";
import type { SummaryResponse } from "@/lib/api/types";
import { formatAmount, formatDay, formatMonth, intlLocale } from "@/lib/format";

import { buildCalendar, HEAT_LEVELS, type CalendarCell } from "./calendar";
import { Panel } from "./panel";

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LABEL_W = 30;
const LABEL_H = 18;
const WEEKDAY_ROWS = [1, 3, 5]; // Mon, Wed, Fri

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Calendar heatmap of daily spending, drawn with D3. `buildCalendar` (d3-time, d3-array,
 * d3-scale) computes the layout; here `scaleBand` positions weeks and weekdays and a keyed
 * `selection.join()` draws the cells and labels, with transitions when the range changes.
 * React owns only the container, the legend and the tooltip.
 *
 * Weeks run from the inline-start side, so time flows right-to-left in Arabic. The SVG itself
 * stays in LTR coordinates (text anchors would otherwise flip) and the x-scale range is reversed.
 */
export function SpendingHeatmap({ data }: { data: SummaryResponse }) {
  const t = useTranslations("Overview.heatmap");
  const locale = useLocale() as Locale;
  const rtl = directionOf(locale) === "rtl";
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ cell: CalendarCell; x: number; y: number } | null>(null);

  const layout = useMemo(
    () => buildCalendar(data.dailySpending, data.range.from, data.range.to),
    [data.dailySpending, data.range.from, data.range.to],
  );
  const width = LABEL_W + layout.weeks * STEP;
  const height = LABEL_H + 7 * STEP;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const duration = prefersReducedMotion() ? 0 : 450;

    const x = scaleBand<number>()
      .domain(range(layout.weeks))
      .range(rtl ? [width - LABEL_W, 0] : [LABEL_W, width])
      .paddingInner(GAP / STEP);
    const y = scaleBand<number>()
      .domain(range(7))
      .range([LABEL_H, height])
      .paddingInner(GAP / STEP);
    const weekday = new Intl.DateTimeFormat(intlLocale(locale), {
      weekday: "short",
      timeZone: "UTC",
    });

    const root = select(svg);

    root
      .selectAll<SVGRectElement, CalendarCell>("rect.day")
      .data(layout.cells, (d) => d.date)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "day")
            .attr("rx", 3)
            .attr("x", (d) => x(d.week) ?? 0)
            .attr("y", (d) => y(d.weekday) ?? 0)
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .attr("opacity", 0)
            .call((cells) =>
              cells
                .transition()
                .duration(duration)
                .delay((d) => (duration ? d.week * 6 : 0))
                .attr("opacity", 1),
            ),
        (update) =>
          update.call((cells) =>
            cells
              .transition()
              .duration(duration)
              .attr("x", (d) => x(d.week) ?? 0)
              .attr("y", (d) => y(d.weekday) ?? 0)
              .attr("width", x.bandwidth())
              .attr("height", y.bandwidth())
              .attr("opacity", 1),
          ),
        (exit) =>
          exit.call((cells) =>
            cells
              .transition()
              .duration(duration / 2)
              .attr("opacity", 0)
              .remove(),
          ),
      )
      .attr("data-level", (d) => d.level)
      .attr("data-date", (d) => d.date)
      // Colours come from the theme tokens, so light/dark switching needs no redraw.
      .attr("fill", (d) => `var(--heat-${d.level})`)
      .on("pointerenter", function (_event, d) {
        // Anchor the tooltip to where D3 actually placed this cell.
        setHover({ cell: d, x: Number(this.getAttribute("x")), y: Number(this.getAttribute("y")) });
      });

    root
      .selectAll<SVGTextElement, { month: string; week: number }>("text.month")
      .data(layout.monthStarts, (d) => d.month)
      .join("text")
      .attr("class", "month fill-fg-muted text-[10px]")
      .attr("x", (d) => (x(d.week) ?? 0) + (rtl ? x.bandwidth() : 0))
      .attr("y", 11)
      .attr("text-anchor", rtl ? "end" : "start")
      .text((d) => formatMonth(d.month, locale));

    root
      .selectAll<SVGTextElement, number>("text.weekday")
      .data(WEEKDAY_ROWS)
      .join("text")
      .attr("class", "weekday fill-fg-muted text-[10px]")
      .attr("x", rtl ? width - 2 : 0)
      .attr("y", (d) => (y(d) ?? 0) + y.bandwidth() - 2)
      .attr("text-anchor", rtl ? "end" : "start")
      .text((d) => weekday.format(new Date(Date.UTC(2026, 1, 1 + d)))); // 2026-02-01 is a Sunday
  }, [layout, width, height, rtl, locale]);

  const money = (minor: number) => formatAmount(minor, data.currency, locale);
  const busiest = [...layout.cells].sort((a, b) => b.amountMinor - a.amountMinor).slice(0, 3);
  const separator = locale === "ar" ? "، " : ", ";
  // Above the cell, or below it on the top rows where there is no room.
  const tooltipStyle = hover
    ? {
        left: Math.min(Math.max(hover.x - 110, 0), Math.max(width - 240, 0)),
        top: hover.y < 2 * STEP + LABEL_H ? hover.y + CELL + 6 : hover.y - 30,
      }
    : undefined;

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
        onPointerLeave={() => setHover(null)}
        dir="ltr"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="block max-w-none"
          role="img"
          aria-label={`${t("title")}. ${t("summary", {
            days: busiest
              .map((c) => `${formatDay(c.date, locale)} (${money(c.amountMinor)})`)
              .join(separator),
          })}`}
          data-testid="heatmap"
        />
        {hover ? (
          <div
            role="status"
            dir={rtl ? "rtl" : "ltr"}
            className="pointer-events-none absolute z-10 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap text-fg shadow-overlay"
            // The container is always dir="ltr" (SVG coordinates), so physical offsets are correct.
            style={tooltipStyle}
          >
            {hover.cell.amountMinor > 0
              ? t("cell", {
                  day: formatDay(hover.cell.date, locale),
                  amount: money(hover.cell.amountMinor),
                  count: hover.cell.count,
                })
              : `${formatDay(hover.cell.date, locale)}: ${t("noSpending")}`}
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-fg-muted">
        {t("summary", { days: busiest.map((c) => formatDay(c.date, locale)).join(separator) })}
      </p>
    </Panel>
  );
}
