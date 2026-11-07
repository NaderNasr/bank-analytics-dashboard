import { describe, expect, it, vi } from "vitest";

import type { SummaryResponse } from "@/lib/api/types";
import { renderWithIntl } from "@/test/intl";

import { SpendingHeatmap } from "./spending-heatmap";

vi.stubGlobal("matchMedia", (query: string) => ({
  matches: query.includes("reduce"),
  media: query,
}));

const data = {
  currency: "JOD",
  range: { from: "2026-02-01", to: "2026-02-28" },
  dailySpending: [
    { date: "2026-02-03", amountMinor: 5_000, count: 2 },
    { date: "2026-02-10", amountMinor: 450_000, count: 1 },
  ],
} as unknown as SummaryResponse;

describe("SpendingHeatmap (D3)", () => {
  it("draws one cell per day with D3, levelled by spending", () => {
    renderWithIntl(<SpendingHeatmap data={data} />);
    const svg = document.querySelector('[data-testid="heatmap"]')!;
    const cells = svg.querySelectorAll("rect.day");
    expect(cells).toHaveLength(28);
    expect(svg.querySelector('[data-date="2026-02-10"]')).toHaveAttribute("data-level", "5");
    expect(svg.querySelector('[data-date="2026-02-04"]')).toHaveAttribute("data-level", "0");
    expect(svg.querySelector('[data-date="2026-02-10"]')).toHaveAttribute("fill", "var(--heat-5)");
    expect(svg.querySelectorAll("text.weekday")).toHaveLength(3);
    expect(svg.querySelector("text.month")).toHaveTextContent("Feb");
  });

  it("mirrors the weeks in Arabic", () => {
    renderWithIntl(<SpendingHeatmap data={data} />, "ar");
    const svg = document.querySelector('[data-testid="heatmap"]')!;
    const x = (date: string) =>
      Number(svg.querySelector(`[data-date="${date}"]`)!.getAttribute("x"));
    // Later weeks sit further left in right-to-left layout.
    expect(x("2026-02-22")).toBeLessThan(x("2026-02-01"));
  });
});
