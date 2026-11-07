"use client";

import { bisector, extent, max, min } from "d3-array";
import { axisBottom, axisLeft, axisRight } from "d3-axis";
import { scaleLinear, scaleUtc } from "d3-scale";
import { pointer, select } from "d3-selection";
import { area, curveMonotoneX, line } from "d3-shape";
import { utcMonth } from "d3-time";
import "d3-transition";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { prefersReducedMotion, useElementWidth } from "@/features/charts/use-element-width";
import { directionOf, type Locale } from "@/i18n/routing";
import type { SummaryResponse } from "@/lib/api/types";
import { formatAmount, formatDay, formatMonth } from "@/lib/format";
import { toMajor } from "@/lib/money";

import { Panel } from "./panel";

const HEIGHT = 240;
const MARGIN = { top: 16, bottom: 28, side: 56, end: 12 };
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

interface Point {
  date: Date;
  day: string;
  value: number;
}

const byDate = bisector<Point, Date>((p) => p.date).center;

/**
 * End-of-day total balance as a D3 area chart: a UTC time scale, monotone curves from d3-shape,
 * month ticks from d3-time, and a pointer crosshair that snaps to the nearest day with
 * `bisector`. A clip-path sweep reveals the line when the period changes (instant under reduced
 * motion). Time runs right-to-left in Arabic by reversing the x range.
 */
export function BalanceChart({ data }: { data: SummaryResponse }) {
  const t = useTranslations("Overview.balance");
  const locale = useLocale() as Locale;
  const rtl = directionOf(locale) === "rtl";
  const clipId = useId().replace(/:/g, "");
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ point: Point; x: number; y: number } | null>(null);
  const { currency } = data;

  const points = useMemo<Point[]>(
    () =>
      data.balanceHistory.map((d) => ({
        date: new Date(`${d.date}T00:00:00Z`),
        day: d.date,
        value: d.totalMinor,
      })),
    [data.balanceHistory],
  );
  const lowest = useMemo(() => min(points, (p) => p.value) ?? 0, [points]);
  const highest = useMemo(() => max(points, (p) => p.value) ?? 0, [points]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0 || points.length === 0) return;
    const duration = prefersReducedMotion() ? 0 : 700;
    const xMin = rtl ? MARGIN.end : MARGIN.side;
    const xMax = width - (rtl ? MARGIN.side : MARGIN.end);

    const [first, last] = extent(points, (p) => p.date) as [Date, Date];
    const x = scaleUtc()
      .domain([first, last])
      .range(rtl ? [xMax, xMin] : [xMin, xMax]);
    const y = scaleLinear()
      .domain([Math.min(0, lowest), highest])
      .nice()
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    const root = select(svg);

    root
      .selectAll<SVGGElement, null>("g.y-axis")
      .data([null])
      .join("g")
      .attr("class", "y-axis chart-axis")
      .attr("font-family", null)
      .attr("transform", `translate(${rtl ? xMax : xMin},0)`)
      .transition()
      .duration(duration)
      .call(
        (rtl ? axisRight(y) : axisLeft(y))
          .ticks(4)
          .tickSize(-(xMax - xMin))
          .tickPadding(8)
          .tickFormat((v) => compact.format(toMajor(Number(v), currency))),
      );

    const months = utcMonth.range(first, last);
    root
      .selectAll<SVGGElement, null>("g.x-axis")
      .data([null])
      .join("g")
      .attr("class", "x-axis chart-axis")
      .attr("font-family", null)
      .attr("transform", `translate(0,${HEIGHT - MARGIN.bottom})`)
      .call(
        axisBottom(x)
          .tickValues(months.filter((_, i) => months.length <= 8 || i % 2 === 0))
          .tickSize(0)
          .tickPadding(10)
          .tickFormat((d) => formatMonth((d as Date).toISOString().slice(0, 7), locale)),
      );

    // Clip rect that sweeps open from the inline-start edge on every redraw.
    const clip = root
      .selectAll<SVGClipPathElement, null>("clipPath")
      .data([null])
      .join((enter) =>
        enter
          .append("clipPath")
          .attr("id", clipId)
          .call((c) => c.append("rect")),
      )
      .select("rect")
      .attr("y", 0)
      .attr("height", HEIGHT);
    clip
      .attr("x", rtl ? xMax : xMin)
      .attr("width", 0)
      .transition()
      .duration(duration)
      .attr("x", xMin)
      .attr("width", xMax - xMin);

    const plot = root
      .selectAll<SVGGElement, null>("g.plot")
      .data([null])
      .join("g")
      .attr("class", "plot")
      .attr("clip-path", `url(#${clipId})`);

    plot
      .selectAll<SVGPathElement, Point[]>("path.area")
      .data([points])
      .join("path")
      .attr("class", "area")
      .attr("fill", "var(--chart-1)")
      .attr("fill-opacity", 0.12)
      .attr(
        "d",
        area<Point>()
          .x((p) => x(p.date))
          .y0(y(Math.max(0, y.domain()[0] ?? 0)))
          .y1((p) => y(p.value))
          .curve(curveMonotoneX),
      );
    plot
      .selectAll<SVGPathElement, Point[]>("path.line")
      .data([points])
      .join("path")
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", "var(--chart-1)")
      .attr("stroke-width", 2)
      .attr(
        "d",
        line<Point>()
          .x((p) => x(p.date))
          .y((p) => y(p.value))
          .curve(curveMonotoneX),
      );

    // Crosshair: a vertical rule and a dot that snap to the nearest day.
    const focus = root
      .selectAll<SVGGElement, null>("g.focus")
      .data([null])
      .join((enter) => {
        const g = enter.append("g").attr("class", "focus").attr("display", "none");
        g.append("line").attr("stroke", "var(--chart-axis)").attr("stroke-dasharray", "3 3");
        g.append("circle")
          .attr("r", 4.5)
          .attr("fill", "var(--chart-1)")
          .attr("stroke", "var(--surface)")
          .attr("stroke-width", 2);
        return g;
      });

    root
      .selectAll<SVGRectElement, null>("rect.overlay")
      .data([null])
      .join("rect")
      .attr("class", "overlay")
      .attr("fill", "transparent")
      .attr("x", xMin)
      .attr("y", MARGIN.top)
      .attr("width", xMax - xMin)
      .attr("height", HEIGHT - MARGIN.top - MARGIN.bottom)
      .on("pointermove", (event: PointerEvent) => {
        const [px] = pointer(event);
        const point = points[byDate(points, x.invert(px))];
        if (!point) return;
        const fx = x(point.date);
        const fy = y(point.value);
        focus.attr("display", null);
        focus
          .select("line")
          .attr("x1", fx)
          .attr("x2", fx)
          .attr("y1", MARGIN.top)
          .attr("y2", HEIGHT - MARGIN.bottom);
        focus.select("circle").attr("cx", fx).attr("cy", fy);
        setHover({ point, x: fx, y: fy });
      })
      .on("pointerleave", () => {
        focus.attr("display", "none");
        setHover(null);
      })
      .raise();
  }, [points, lowest, highest, width, rtl, locale, currency, clipId]);

  const money = (minor: number) => formatAmount(minor, currency, locale);
  const now = points.at(-1)?.value;

  // Month-end balances for screen readers.
  const monthEnds = points.filter((p, i) => points[i + 1]?.day.slice(0, 7) !== p.day.slice(0, 7));

  return (
    <Panel
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        now !== undefined ? (
          <dl className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-fg-muted">
            <dt className="sr-only">{t("tooltip")}</dt>
            <dd className="text-sm font-semibold text-fg">
              <bdi className="tabular">{t("current", { amount: money(now) })}</bdi>
            </dd>
            <dd>
              <bdi className="tabular">{t("high", { amount: money(highest) })}</bdi> ·{" "}
              <bdi className="tabular">{t("low", { amount: money(lowest) })}</bdi>
            </dd>
          </dl>
        ) : null
      }
    >
      <div ref={containerRef} className="relative" dir="ltr">
        <svg
          ref={svgRef}
          width={width}
          height={HEIGHT}
          aria-hidden
          data-testid="balance-chart"
          className="block touch-none"
        />
        {hover ? (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-border bg-surface px-3 py-2 text-xs whitespace-nowrap shadow-overlay"
            dir={rtl ? "rtl" : "ltr"}
            // The chart container is always LTR (SVG coordinates), so physical offsets are correct.
            style={{
              left: Math.min(Math.max(hover.x - 80, 0), Math.max(width - 170, 0)),
              top: Math.max(hover.y - 58, 0),
            }}
            data-testid="balance-tooltip"
          >
            <p className="text-fg-muted">{formatDay(hover.point.day, locale)}</p>
            <bdi className="block font-semibold text-fg tabular">{money(hover.point.value)}</bdi>
          </div>
        ) : null}
      </div>
      <table className="sr-only">
        <caption>{t("tableCaption")}</caption>
        <tbody>
          {monthEnds.map((p) => (
            <tr key={p.day}>
              <th scope="row">{formatDay(p.day, locale)}</th>
              <td>{money(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
