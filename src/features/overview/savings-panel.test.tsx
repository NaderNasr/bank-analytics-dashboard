import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, within } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { InsightsResponse } from "@/lib/api/types";
import { renderWithIntl } from "@/test/intl";

import { SavingsPanel } from "./savings-panel";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    ...props
  }: ComponentProps<"a"> & { href: { pathname: string; query: Record<string, string> } }) => (
    <a href={`${href.pathname}?${new URLSearchParams(href.query)}`} {...props} />
  ),
}));

const response: InsightsResponse = {
  range: { from: "2025-11-01", to: "2026-10-31" },
  months: 12,
  totalMonthlySavingMinor: 146_582,
  insights: [
    {
      id: "coffee",
      monthlySavingMinor: 141_592,
      evidence: {
        visitsPerMonth: 135,
        monthlyMinor: 330_382,
        averageMinor: 2_450,
        homeCupMinor: 350,
      },
      link: { category: "coffee" },
    },
    {
      id: "overlappingMusic",
      monthlySavingMinor: 4_990,
      evidence: {
        services: "Anghami Plus + Spotify",
        cheaper: "Anghami Plus",
        monthlyTotalMinor: 6_480,
      },
      link: { category: "subscriptions" },
    },
  ],
};

function renderPanel(locale: "en" | "ar" = "en") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(response))),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = (ui: ReactNode) => <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
  return renderWithIntl(
    wrap(<SavingsPanel months={12} currency="JOD" />) as React.ReactElement,
    locale,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("SavingsPanel", () => {
  it("states the total and explains each suggestion with its evidence", async () => {
    renderPanel();
    expect(await screen.findByText(/You could save about JOD\s147 a month/)).toBeInTheDocument();
    expect(screen.getByText(/That's about JOD\s1,759 a year/)).toBeInTheDocument();

    const coffee = screen.getByTestId("saving-coffee");
    expect(within(coffee).getByRole("heading", { name: "Coffee shops" })).toBeInTheDocument();
    expect(coffee).toHaveTextContent(/Save ≈ JOD\s142\/month/);
    expect(coffee).toHaveTextContent(
      /About 135 café coffees a month at JOD\s2\.450 each \(JOD\s330\.382 a month\)/,
    );
    expect(within(coffee).getByRole("link", { name: "See transactions" })).toHaveAttribute(
      "href",
      "/transactions?category=coffee",
    );

    expect(screen.getByTestId("saving-overlappingMusic")).toHaveTextContent(
      "You pay for Anghami Plus + Spotify",
    );
  });

  it("is translated into Arabic", async () => {
    renderPanel("ar");
    expect(await screen.findByRole("heading", { name: "المقاهي" })).toBeInTheDocument();
    expect(screen.getByText(/يمكنك توفير نحو/)).toBeInTheDocument();
  });
});
