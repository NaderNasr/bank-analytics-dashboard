"use client";

import { useLocale, useTranslations } from "next-intl";

import type { Locale } from "@/i18n/routing";
import type { SummaryResponse } from "@/lib/api/types";
import { formatAmount, formatPercent } from "@/lib/format";

import { Panel } from "./panel";

const MAX_ROWS = 7;

/**
 * Magnitude comparison across categories: one hue, sorted bars, values written next to each bar
 * (so no legend and no colour-only meaning). Beyond seven categories the rest fold into "Other".
 */
export function CategoryBreakdown({ data }: { data: SummaryResponse }) {
  const t = useTranslations("Overview.categories");
  const tCat = useTranslations("Categories");
  const locale = useLocale() as Locale;

  const top = data.spendingByCategory.slice(0, MAX_ROWS);
  const rest = data.spendingByCategory.slice(MAX_ROWS);
  const rows = rest.length
    ? [
        ...top.map((c) => ({ key: c.slug, label: tCat(c.slug as never), ...c })),
        {
          key: "other",
          label: t("other"),
          amountMinor: rest.reduce((s, c) => s + c.amountMinor, 0),
          count: rest.reduce((s, c) => s + c.count, 0),
          share: rest.reduce((s, c) => s + c.share, 0),
        },
      ]
    : top.map((c) => ({ key: c.slug, label: tCat(c.slug as never), ...c }));
  const max = Math.max(...rows.map((r) => r.share), 0.0001);

  return (
    <Panel title={t("title")} subtitle={t("subtitle")}>
      <ul className="flex flex-col gap-3" data-testid="categories">
        {rows.map((r) => (
          <li key={r.key} title={t("transactions", { count: r.count })}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-fg">{r.label}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                <bdi className="text-fg tabular">
                  {formatAmount(r.amountMinor, data.currency, locale)}
                </bdi>
                <span className="w-12 text-end text-xs text-fg-muted tabular">
                  {formatPercent(r.share, locale)}
                </span>
              </span>
            </div>
            <div aria-hidden className="h-2 rounded-full bg-surface-muted">
              <div
                className="h-2 rounded-full bg-chart-1"
                style={{ width: `${Math.max((r.share / max) * 100, 1.5)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
