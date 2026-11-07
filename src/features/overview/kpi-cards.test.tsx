import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Kpis, SummaryResponse } from "@/lib/api/types";
import { renderWithIntl } from "@/test/intl";

import { deltaFor, KpiCards } from "./kpi-cards";

const kpis = (overrides: Partial<Kpis>): Kpis => ({
  incomeMinor: 0,
  spendingMinor: 0,
  netMinor: 0,
  savingsRate: null,
  transactionCount: 0,
  averageDailySpendingMinor: 0,
  failedCount: 0,
  pendingCount: 0,
  ...overrides,
});

function summary(previous: Kpis | null): SummaryResponse {
  return {
    currency: "JOD",
    range: { from: "2026-08-01", to: "2026-10-31" },
    previousRange: { from: "2026-05-01", to: "2026-07-31" },
    balances: { totalMinor: 11_116_390, accounts: [] },
    kpis: kpis({ incomeMinor: 14_700_000, spendingMinor: 13_000_000, savingsRate: 0.12 }),
    previousKpis: previous,
    cashFlow: [],
    spendingByCategory: [],
    balanceHistory: [],
    dailySpending: [],
    topMerchants: [],
  };
}

describe("deltaFor", () => {
  it("treats a rise as good or bad depending on the measure", () => {
    expect(deltaFor(0.1, "higher-is-better")).toEqual({ up: true, good: true });
    expect(deltaFor(0.1, "lower-is-better")).toEqual({ up: true, good: false });
    expect(deltaFor(-0.1, "lower-is-better")).toEqual({ up: false, good: true });
  });

  it("is neutral when flat or not comparable", () => {
    expect(deltaFor(0, "higher-is-better")).toEqual({ up: null, good: null });
    expect(deltaFor(null, "higher-is-better")).toEqual({ up: null, good: null });
  });
});

describe("KpiCards", () => {
  it("shows values and marks higher spending as worse, not only by colour", () => {
    renderWithIntl(
      <KpiCards
        data={summary(
          kpis({ incomeMinor: 14_000_000, spendingMinor: 10_000_000, savingsRate: 0.2 }),
        )}
      />,
    );
    const tiles = screen.getByTestId("kpis");
    expect(tiles).toHaveTextContent(/JOD\s11,116\.390/);

    const spending = within(tiles).getByText("Spending").parentElement!;
    expect(spending).toHaveTextContent("+30% vs previous period");
    expect(spending).toHaveTextContent("(worse)");

    const income = within(tiles).getByText("Income").parentElement!;
    expect(income).toHaveTextContent("+5% vs previous period");
    expect(income).toHaveTextContent("(better)");

    const rate = within(tiles).getByText("Savings rate").parentElement!;
    expect(rate).toHaveTextContent("12%");
    expect(rate).toHaveTextContent("-8 pts vs previous period");
  });

  it("says there is nothing to compare when the previous period is unavailable", () => {
    renderWithIntl(<KpiCards data={summary(null)} />);
    expect(screen.getAllByText("No previous period to compare")).toHaveLength(3);
  });

  it("renders Arabic labels with Latin digits", () => {
    renderWithIntl(<KpiCards data={summary(null)} />, "ar");
    const tiles = screen.getByTestId("kpis");
    expect(within(tiles).getByText("إجمالي الرصيد")).toBeInTheDocument();
    expect(tiles.textContent).toMatch(/11,116\.390/);
  });
});
