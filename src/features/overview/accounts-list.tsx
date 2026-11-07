"use client";

import { CreditCard, Landmark, PiggyBank } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { Locale } from "@/i18n/routing";
import type { SummaryResponse } from "@/lib/api/types";
import { formatAmount } from "@/lib/format";

import { Panel } from "./panel";

const ICONS = { current: Landmark, savings: PiggyBank, card: CreditCard } as const;

export function AccountsList({ data }: { data: SummaryResponse }) {
  const t = useTranslations("Overview.accounts");
  const tType = useTranslations("AccountTypes");
  const locale = useLocale() as Locale;
  const money = (minor: number) => formatAmount(minor, data.currency, locale);

  return (
    <Panel title={t("title")}>
      <ul className="flex flex-col gap-3">
        {data.balances.accounts.map((a) => {
          const Icon = ICONS[a.type];
          return (
            <li key={a.id} className="flex items-center gap-3 rounded-md bg-surface-muted p-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-primary">
                <Icon aria-hidden className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{tType(a.type)}</span>
                <span className="block text-xs text-fg-muted" dir="ltr">
                  <bdi>{a.maskedNumber}</bdi>
                </span>
              </span>
              <span className="flex flex-col items-end">
                <bdi
                  className={`text-sm font-semibold tabular ${a.balanceMinor < 0 ? "text-negative" : "text-fg"}`}
                >
                  {money(a.balanceMinor)}
                </bdi>
                <span className="text-xs text-fg-muted">
                  {a.creditLimitMinor !== null
                    ? t("limit", { amount: money(a.creditLimitMinor) })
                    : t("available", { amount: money(a.availableMinor) })}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
