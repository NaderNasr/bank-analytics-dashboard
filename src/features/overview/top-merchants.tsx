"use client";

import { useLocale, useTranslations } from "next-intl";

import type { Locale } from "@/i18n/routing";
import type { SummaryResponse } from "@/lib/api/types";
import { formatAmount } from "@/lib/format";

import { Panel } from "./panel";

export function TopMerchants({ data }: { data: SummaryResponse }) {
  const t = useTranslations("Overview.merchants");
  const tCat = useTranslations("Overview.categories");
  const locale = useLocale() as Locale;
  const merchants = data.topMerchants.slice(0, 6);

  return (
    <Panel title={t("title")} subtitle={t("subtitle")}>
      <ol className="flex flex-col divide-y divide-border">
        {merchants.map((m, i) => (
          <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-fg-muted tabular">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-fg">{m.name}</span>
              <span className="block text-xs text-fg-muted">
                {tCat("transactions", { count: m.count })}
              </span>
            </span>
            <bdi className="text-sm font-medium text-fg tabular">
              {formatAmount(m.amountMinor, data.currency, locale)}
            </bdi>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
