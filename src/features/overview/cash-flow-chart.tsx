"use client";

import { max, min } from "d3-array";
import { axisBottom, axisLeft, axisRight } from "d3-axis";
import { scaleBand, scaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { curveMonotoneX, line } from "d3-shape";
import "d3-transition";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { prefersReducedMotion, useElementWidth } from "@/features/charts/use-element-width";
import { directionOf, type Locale } from "@/i18n/routing";
import type { SummaryResponse } from "@/lib/api/types";
import { formatAmount, formatMonth } from "@/lib/format";
import { toMajor } from "@/lib/money";

import { Panel } from "./panel";

const HEIGHT = 260;
const MARGIN = { top: 12, bottom: 28, side: 56, end: 8 };
const SERIES = [
  { key: "income", color: "var(--chart-1)" },
  { key: "spending", color: "var(--chart-2)" },
] as const;

interface Row {
  month: string;
  income: number;
  spending: number;
  net: number;
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Monthly income vs spending as grouped bars with a net line, drawn with D3: band scales for
 * months and series, a linear value scale that includes zero (net can be negative), d3-axis for
 * the axes and a keyed join so bars grow and move when the period changes. One value axis only.
 * Mirrored for Arabic by reversing the month scale and moving the axis to the right.
 */
export function CashFlowChart({ data }: { data: SummaryResponse }) {
  const t = useTranslations("Overview.cashFlow");
  const locale = useLocale() as Locale;
  const rtl = directionOf(locale) === "rtl";
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ row: Row; x: number } | null>(null);
  const { currency } = data;

  const rows = useMemo<Row[]>(
    () =>
      data.cashFlow.map((m) => ({
        month: m.month,
        income: m.incomeMinor,
        spending: m.spendingMinor,
        net: m.incomeMinor - m.spendingMinor,
      })),
    [data.cashFlow],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    const duration = prefersReducedMotion() ? 0 : 500;
    const xMin = rtl ? MARGIN.end : MARGIN.side;
    const xMax = width - (rtl ? MARGIN.side : MARGIN.end);

    const x = scaleBand<string>()
      .domain(rows.map((r) => r.month))
      .range(rtl ? [xMax, xMin] : [xMin, xMax])
      .paddingInner(0.28)
      .paddingOuter(0.12);
    const x1 = scaleBand<string>()
      .domain(SERIES.map((s) => s.key))
      .range([0, x.bandwidth()])
      .paddingInner(0.12);
    const y = scaleLinear()
      .domain([
        Math.min(0, min(rows, (r) => r.net) ?? 0),
        max(rows, (r) => Math.max(r.income, r.spending)) ?? 1,
      ])
      .nice()
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    const root = select(svg);

    // Grid + value axis (with gridlines drawn by the axis ticks).
    const yAxis = (rtl ? axisRight(y) : axisLeft(y))
      .ticks(5)
      .tickSize(-(xMax - xMin))
      .tickPadding(8)
      .tickFormat((v) => compact.format(toMajor(Number(v), currency)));
    root
      .selectAll<SVGGElement, null>("g.y-axis")
      .data([null])
      .join("g")
      .attr("class", "y-axis chart-axis")
      .attr("transform", `translate(${rtl ? xMax : xMin},0)`)
      .attr("font-family", null)
      .transition()
      .duration(duration)
      .call(yAxis);

    root
      .selectAll<SVGGElement, null>("g.x-axis")
      .data([null])
      .join("g")
      .attr("class", "x-axis chart-axis")
      .attr("transform", `translate(0,${HEIGHT - MARGIN.bottom})`)
      .attr("font-family", null)
      .call(
        axisBottom(x)
          .tickSize(0)
          .tickPadding(10)
          .tickFormat((m) => formatMonth(m, locale)),
      );

    // Bars: one group per month, one rect per series. Keyed by month so a period change moves
    // existing months and grows new ones from the baseline.
    const groups = root
      .selectAll<SVGGElement, Row>("g.month")
      .data(rows, (d) => d.month)
      .join(
        (enter) =>
          enter
            .append("g")
            .attr("class", "month")
            .attr("transform", (d) => `translate(${x(d.month)},0)`),
        (update) => update,
        (exit) =>
          exit
            .transition()
            .duration(duration / 2)
            .attr("opacity", 0)
            .remove(),
      );
    groups
      .transition()
      .duration(duration)
      .attr("transform", (d) => `translate(${x(d.month)},0)`)
      .attr("opacity", 1);

    groups
      .selectAll<SVGRectElement, { key: string; value: number; color: string }>("rect.bar")
      .data(
        (d) => SERIES.map((s) => ({ key: s.key, value: d[s.key], color: s.color })),
        (d) => d.key,
      )
      .join((enter) =>
        enter.append("rect").attr("class", "bar").attr("rx", 3).attr("y", y(0)).attr("height", 0),
      )
      .attr("data-series", (d) => d.key)
      .attr("fill", (d) => d.color)
      // In Arabic the series order mirrors too: income sits on the inline-start (right) side.
      .attr("x", (d) =>
        rtl ? x.bandwidth() - (x1(d.key) ?? 0) - x1.bandwidth() : (x1(d.key) ?? 0),
      )
      .attr("width", x1.bandwidth())
      .transition()
      .duration(duration)
      .attr("y", (d) => y(Math.max(0, d.value)))
      .attr("height", (d) => Math.abs(y(d.value) - y(0)));

    // Net line over the bars (same unit, same axis).
    const netLine = line<Row>()
      .x((d) => (x(d.month) ?? 0) + x.bandwidth() / 2)
      .y((d) => y(d.net))
      .curve(curveMonotoneX);
    root
      .selectAll<SVGPathElement, Row[]>("path.net")
      .data([rows])
      .join("path")
      .attr("class", "net")
      .attr("fill", "none")
      .attr("stroke", "var(--fg)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 3")
      .transition()
      .duration(duration)
      .attr("d", netLine);
    root
      .selectAll<SVGCircleElement, Row>("circle.net-point")
      .data(rows, (d) => d.month)
      .join("circle")
      .attr("class", "net-point")
      .attr("r", 3.5)
      .attr("fill", "var(--surface)")
      .attr("stroke", "var(--fg)")
      .attr("stroke-width", 2)
      .transition()
      .duration(duration)
      .attr("cx", (d) => (x(d.month) ?? 0) + x.bandwidth() / 2)
      .attr("cy", (d) => y(d.net));

    // Hit targets: a full-height band per month, bigger than the bars.
    root
      .selectAll<SVGRectElement, Row>("rect.hit")
      .data(rows, (d) => d.month)
      .join("rect")
      .attr("class", "hit")
      .attr("fill", "transparent")
      .attr("x", (d) => (x(d.month) ?? 0) - (x.step() - x.bandwidth()) / 2)
      .attr("width", x.step())
      .attr("y", MARGIN.top)
      .attr("height", HEIGHT - MARGIN.top - MARGIN.bottom)
      .on("pointerenter", (_event, d) =>
        setHover({ row: d, x: (x(d.month) ?? 0) + x.bandwidth() / 2 }),
      )
      .raise();
  }, [rows, width, rtl, locale, currency]);

  const legend = [
    ...SERIES.map((s) => ({
      key: s.key,
      swatch: <span className="size-2.5 rounded-sm" style={{ background: s.color }} />,
    })),
    {
      key: "net" as const,
      swatch: <span className="h-0 w-3.5 border-t-2 border-dashed border-fg" />,
    },
  ];

  return (
    <Panel
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <ul className="flex shrink-0 items-center gap-4 text-xs text-fg-muted">
          {legend.map((l) => (
            <li key={l.key} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-flex items-center">
                {l.swatch}
              </span>
              {t(l.key)}
            </li>
          ))}
        </ul>
      }
    >
      <div ref={containerRef} className="relative" dir="ltr" onPointerLeave={() => setHover(null)}>
        <svg
          ref={svgRef}
          width={width}
          height={HEIGHT}
          aria-hidden
          data-testid="cash-flow-chart"
          className="block"
        />
        {hover ? (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-overlay"
            dir={rtl ? "rtl" : "ltr"}
            // The chart container is always LTR (SVG coordinates), so a physical offset is correct.
            style={{ left: Math.min(Math.max(hover.x - 90, 0), Math.max(width - 190, 0)) }}
          >
            <p className="mb-1 font-semibold text-fg">
              {formatMonth(hover.row.month, locale, true)}
            </p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-6 text-fg-muted">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-sm" style={{ background: s.color }} />
                  {t(s.key)}
                </span>
                <bdi className="text-fg tabular">
                  {formatAmount(hover.row[s.key], currency, locale)}
                </bdi>
              </p>
            ))}
            <p className="mt-1 flex justify-between gap-6 border-t border-border pt-1 text-fg-muted">
              {t("net")}
              <bdi
                className={`font-medium tabular ${hover.row.net >= 0 ? "text-positive" : "text-negative"}`}
              >
                {formatAmount(hover.row.net, currency, locale, { signed: true })}
              </bdi>
            </p>
          </div>
        ) : null}
      </div>
      <table className="sr-only">
        <caption>{t("tableCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("title")}</th>
            <th scope="col">{t("income")}</th>
            <th scope="col">{t("spending")}</th>
            <th scope="col">{t("net")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <th scope="row">{formatMonth(r.month, locale, true)}</th>
              <td>{formatAmount(r.income, currency, locale)}</td>
              <td>{formatAmount(r.spending, currency, locale)}</td>
              <td>{formatAmount(r.net, currency, locale, { signed: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
