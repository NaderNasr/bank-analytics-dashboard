import { beforeAll, describe, expect, it, vi } from "vitest";

import type { SummaryResponse } from "@/lib/api/types";
import { renderWithIntl } from "@/test/intl";

import { BalanceChart } from "./balance-chart";
import { CashFlowChart } from "./cash-flow-chart";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce"),
    media: query,
  }));
});

const data = {
  currency: "JOD",
  cashFlow: [
    { month: "2026-08", incomeMinor: 4_900_000, spendingMinor: 4_100_000 },
    { month: "2026-09", incomeMinor: 4_900_000, spendingMinor: 5_300_000 },
    { month: "2026-10", incomeMinor: 4_900_000, spendingMinor: 4_400_000 },
  ],
  balanceHistory: [
    { date: "2026-10-01", totalMinor: 10_000_000 },
    { date: "2026-10-02", totalMinor: 9_500_000 },
    { date: "2026-10-03", totalMinor: 11_200_000 },
  ],
} as unknown as SummaryResponse;

const svg = (id: string) => document.querySelector(`[data-testid="${id}"]`)!;

describe("CashFlowChart (D3)", () => {
  it("draws two bars per month, a net line and axes", () => {
    renderWithIntl(<CashFlowChart data={data} />);
    const chart = svg("cash-flow-chart");
    expect(chart.querySelectorAll("rect.bar")).toHaveLength(6);
    expect(chart.querySelectorAll('rect.bar[data-series="income"]')).toHaveLength(3);
    expect(chart.querySelectorAll("circle.net-point")).toHaveLength(3);
    expect(chart.querySelector("path.net")).not.toBeNull();
    expect([...chart.querySelectorAll(".x-axis text")].map((t) => t.textContent)).toEqual([
      "Aug",
      "Sep",
      "Oct",
    ]);
  });

  it("mirrors the months in Arabic", () => {
    renderWithIntl(<CashFlowChart data={data} />, "ar");
    const months = [...svg("cash-flow-chart").querySelectorAll<SVGGElement>(".x-axis .tick")];
    const xOf = (g: SVGGElement) =>
      Number(/translate\(([\d.]+)/.exec(g.getAttribute("transform") ?? "")?.[1]);
    expect(xOf(months[0]!)).toBeGreaterThan(xOf(months[2]!));
  });

  it("keeps the exact numbers in a screen-reader table", () => {
    renderWithIntl(<CashFlowChart data={data} />);
    expect(document.querySelector("table caption")).toHaveTextContent(
      "Monthly income and spending",
    );
    expect(document.querySelectorAll("tbody tr")).toHaveLength(3);
  });
});

describe("BalanceChart (D3)", () => {
  it("draws the area and line and states current, high and low", () => {
    const { container } = renderWithIntl(<BalanceChart data={data} />);
    const chart = svg("balance-chart");
    expect(chart.querySelector("path.line")?.getAttribute("d")).toMatch(/^M/);
    expect(chart.querySelector("path.area")).not.toBeNull();
    expect(container).toHaveTextContent(/Now JOD\s11,200\.000/);
    expect(container).toHaveTextContent(/Highest JOD\s11,200\.000/);
    expect(container).toHaveTextContent(/Lowest JOD\s9,500\.000/);
  });
});
