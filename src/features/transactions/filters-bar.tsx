"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { TRANSACTION_STATUSES } from "@/lib/api/types";
import { CATEGORY_OPTIONS } from "@/lib/categories";

import { accountsQuery } from "./transactions-query";
import { activeFilterCount, toSearchParams, type ExplorerFilters } from "./url-state";

const control =
  "h-10 rounded-md border border-border-strong bg-surface px-3 text-sm text-fg transition-colors duration-150 hover:border-fg-muted";

interface FiltersBarProps {
  filters: ExplorerFilters;
  total: number | undefined;
  onChange: (patch: Partial<ExplorerFilters>) => void;
  onClear: () => void;
}

export function FiltersBar({ filters, total, onChange, onClear }: FiltersBarProps) {
  const t = useTranslations("Transactions");
  const tCat = useTranslations("Categories");
  const tType = useTranslations("AccountTypes");
  const accounts = useQuery(accountsQuery);

  // Typing updates the URL after a short pause; a URL change from elsewhere resets the box.
  const [search, setSearch] = useState(filters.q ?? "");
  const [lastQ, setLastQ] = useState(filters.q);
  if (filters.q !== lastQ) {
    setLastQ(filters.q);
    setSearch(filters.q ?? "");
  }
  useEffect(() => {
    if ((filters.q ?? "") === search.trim()) return;
    const id = setTimeout(() => onChange({ q: search.trim() || undefined }), 300);
    return () => clearTimeout(id);
  }, [search, filters.q, onChange]);

  const exportQs = toSearchParams(filters).toString();
  const active = activeFilterCount(filters);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-xs font-medium text-fg-muted">
          {t("search")}
          <span className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              maxLength={100}
              className={`${control} w-full ps-9`}
            />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-fg-muted">
          {t("from")}
          <input
            type="date"
            dir="ltr"
            value={filters.from ?? ""}
            max={filters.to}
            onChange={(e) => onChange({ from: e.target.value || undefined })}
            className={control}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-fg-muted">
          {t("to")}
          <input
            type="date"
            dir="ltr"
            value={filters.to ?? ""}
            min={filters.from}
            onChange={(e) => onChange({ to: e.target.value || undefined })}
            className={control}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
        <Select
          label={t("category")}
          value={filters.category}
          onChange={(category) => onChange({ category })}
          options={[
            { value: "", label: t("allCategories") },
            ...CATEGORY_OPTIONS.map((c) => ({ value: c.slug, label: tCat(c.slug as never) })),
          ]}
        />
        <Select
          label={t("account")}
          value={filters.account}
          onChange={(account) => onChange({ account })}
          options={[
            { value: "", label: t("allAccounts") },
            ...(accounts.data?.data ?? []).map((a) => ({
              value: a.id,
              label: `${tType(a.type)} ${a.maskedNumber}`,
            })),
          ]}
        />
        <Select
          label={t("direction")}
          value={filters.direction}
          onChange={(direction) =>
            onChange({ direction: direction as ExplorerFilters["direction"] })
          }
          options={[
            { value: "", label: t("allDirections") },
            { value: "credit", label: t("moneyIn") },
            { value: "debit", label: t("moneyOut") },
          ]}
        />
        <Select
          label={t("status")}
          value={filters.status}
          onChange={(status) => onChange({ status: status as ExplorerFilters["status"] })}
          options={[
            { value: "", label: t("allStatuses") },
            ...TRANSACTION_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) })),
          ]}
        />

        <div className="col-span-2 flex items-center justify-end gap-2 sm:ms-auto">
          {active > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                onClear();
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              <X aria-hidden className="size-4" />
              {t("clear")}
            </button>
          ) : null}
          <a
            href={`/api/transactions/export${exportQs ? `?${exportQs}` : ""}`}
            download
            aria-label={total !== undefined ? t("exportLabel", { count: total }) : t("export")}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition-colors duration-150 hover:bg-primary-hover"
          >
            <Download aria-hidden className="size-4" />
            {t("export")}
          </a>
        </div>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-fg-muted sm:min-w-40">
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={`${control} w-full pe-8`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
