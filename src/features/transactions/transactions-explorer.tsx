"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, RotateCw, SearchX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { TransactionSortField } from "@/lib/api/transactions-query";
import type { TransactionListItem, TransactionStatus } from "@/lib/api/types";
import { formatAmount, intlLocale } from "@/lib/format";

import { FiltersBar } from "./filters-bar";
import { transactionsQuery } from "./transactions-query";
import {
  filtersFromSearchParams,
  nextSort,
  toSearchParams,
  type ExplorerFilters,
} from "./url-state";

const ROW_HEIGHT = 56;
const GRID =
  "grid grid-cols-[minmax(9.5rem,0.9fr)_minmax(14rem,2.4fr)_minmax(8rem,1.1fr)_minmax(7.5rem,1fr)_minmax(6.5rem,0.8fr)_minmax(9rem,1fr)]";

const STATUS_STYLE: Record<TransactionStatus, string> = {
  posted: "text-fg-muted",
  pending: "text-warning",
  failed: "text-negative",
  reversed: "text-fg-muted",
};

/**
 * The transactions explorer. URL = state (filters and sort), the server does the filtering and
 * sorting, TanStack Query pages it in 100 rows at a time as you scroll, and TanStack Virtual keeps
 * only the visible rows in the DOM, so 12,000 rows scroll as smoothly as 50.
 */
export function TransactionsExplorer() {
  const t = useTranslations("Transactions");
  const tCat = useTranslations("Categories");
  const tType = useTranslations("AccountTypes");
  const locale = useLocale() as Locale;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const qs = toSearchParams(filters).toString();

  const setFilters = useCallback(
    (patch: Partial<ExplorerFilters>) => {
      const next = toSearchParams({
        ...filtersFromSearchParams(new URLSearchParams(window.location.search)),
        ...patch,
      });
      router.replace({ pathname, query: Object.fromEntries(next) }, { scroll: false });
    },
    [pathname, router],
  );
  const clearFilters = useCallback(
    () =>
      setFilters({
        q: undefined,
        from: undefined,
        to: undefined,
        category: undefined,
        account: undefined,
        status: undefined,
        direction: undefined,
      }),
    [setFilters],
  );

  const query = useInfiniteQuery({ ...transactionsQuery(qs), placeholderData: keepPreviousData });
  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.data) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total;

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale(locale), {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Amman",
      }),
    [locale],
  );
  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale(locale), {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Amman",
      }),
    [locale],
  );

  const columns = useMemo<ColumnDef<TransactionListItem>[]>(
    () => [
      {
        id: "occurredAt",
        header: t("columns.occurredAt"),
        cell: ({ row: { original: tx } }) => (
          <span className="flex flex-col">
            <span className="whitespace-nowrap text-fg tabular">
              {dateFormat.format(new Date(tx.occurredAt))}
            </span>
            <span className="text-xs text-fg-muted tabular">
              {timeFormat.format(new Date(tx.occurredAt))}
            </span>
          </span>
        ),
      },
      {
        id: "description",
        header: t("columns.description"),
        cell: ({ row: { original: tx } }) => (
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-fg">
              {tx.merchant?.name ?? tx.description}
            </span>
            <span className="truncate text-xs text-fg-muted">
              <bdi>{tx.merchant ? tx.description : tx.reference}</bdi>
            </span>
          </span>
        ),
      },
      {
        id: "category",
        header: t("columns.category"),
        cell: ({ row: { original: tx } }) => (
          <span className="truncate text-fg">{tCat(tx.category.slug as never)}</span>
        ),
      },
      {
        id: "account",
        header: t("columns.account"),
        cell: ({ row: { original: tx } }) => (
          <span className="truncate text-fg-muted">{tType(tx.account.type)}</span>
        ),
      },
      {
        id: "status",
        header: t("columns.status"),
        cell: ({ row: { original: tx } }) => (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${STATUS_STYLE[tx.status]}`}
          >
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {t(`statuses.${tx.status}`)}
          </span>
        ),
      },
      {
        id: "amount",
        header: t("columns.amount"),
        cell: ({ row: { original: tx } }) => {
          const signed = tx.direction === "debit" ? -tx.amountMinor : tx.amountMinor;
          const void_ = tx.status === "failed" || tx.status === "reversed";
          return (
            <bdi
              className={`block text-end font-medium tabular ${
                void_
                  ? "text-fg-muted line-through"
                  : tx.direction === "credit"
                    ? "text-positive"
                    : "text-fg"
              }`}
            >
              {formatAmount(signed, tx.currency, locale, { signed: true })}
            </bdi>
          );
        },
      },
    ],
    [t, tCat, tType, locale, dateFormat, timeFormat],
  );

  // TanStack Table returns functions the React Compiler cannot memoise; it skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    getRowId: (row) => row.id,
    state: { sorting: [{ id: filters.sort, desc: filters.order === "desc" }] },
  });
  const tableRows = table.getRowModel().rows;

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });
  const items = virtualizer.getVirtualItems();
  const lastIndex = items.at(-1)?.index ?? 0;

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && lastIndex >= tableRows.length - 20)
      void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, lastIndex, tableRows.length]);

  // A new filter or sort starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [qs]);

  const sortLabel = (field: TransactionSortField) =>
    filters.sort === field ? (filters.order === "asc" ? "ascending" : "descending") : "none";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{t("title")}</h1>
          <p className="text-sm text-fg-muted">{t("description")}</p>
          <span aria-hidden className="mt-2 h-0.5 w-16 rounded-full bg-gold-accent" />
        </div>
        <p
          className="text-sm font-medium text-fg-muted tabular"
          aria-live="polite"
          data-testid="result-count"
        >
          {total !== undefined ? t("count", { count: total }) : ""}
        </p>
      </div>

      <FiltersBar filters={filters} total={total} onChange={setFilters} onClear={clearFilters} />

      {query.isError && !query.data ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg bg-negative-soft p-4 text-sm text-on-negative-soft"
        >
          <AlertCircle aria-hidden className="size-5 shrink-0" />
          <span className="flex-1">{t("error.title")}</span>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-surface px-3 font-medium text-fg ring-1 ring-border-strong"
          >
            <RotateCw aria-hidden className="size-4" />
            {t("error.retry")}
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <div
          ref={scrollRef}
          className={`h-[calc(100dvh-22rem)] min-h-[26rem] overflow-auto transition-opacity duration-200 ${
            query.isPlaceholderData ? "opacity-60" : ""
          }`}
        >
          <div
            role="table"
            aria-label={t("tableLabel")}
            aria-rowcount={total !== undefined ? total + 1 : -1}
            aria-busy={query.isFetching}
            className="min-w-[56rem] text-sm"
          >
            <div
              role="rowgroup"
              className="sticky top-0 z-10 border-b border-border bg-surface-muted"
            >
              {table.getHeaderGroups().map((group) => (
                <div role="row" aria-rowindex={1} key={group.id} className={`${GRID} gap-4 px-4`}>
                  {group.headers.map((header) => {
                    const field = header.column.id as TransactionSortField;
                    const active = filters.sort === field;
                    const Icon = !active
                      ? ArrowUpDown
                      : filters.order === "asc"
                        ? ArrowUp
                        : ArrowDown;
                    return (
                      <div
                        role="columnheader"
                        aria-sort={sortLabel(field)}
                        key={header.id}
                        className={field === "amount" ? "text-end" : ""}
                      >
                        <button
                          type="button"
                          onClick={() => setFilters(nextSort(filters, field))}
                          className={`inline-flex h-11 items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${
                            active ? "text-fg" : "text-fg-muted hover:text-fg"
                          }`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <Icon
                            aria-hidden
                            className={`size-3.5 ${active ? "text-primary" : "opacity-60"}`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {query.isPending ? (
              <div role="rowgroup" aria-label={t("loading")}>
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    role="row"
                    className="flex h-14 items-center border-b border-border px-4"
                  >
                    <span className="h-3 w-full animate-pulse rounded bg-surface-muted" />
                  </div>
                ))}
              </div>
            ) : tableRows.length === 0 && !query.isError ? (
              <div role="rowgroup">
                <div role="row" className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                  <SearchX aria-hidden className="size-8 text-fg-muted" />
                  <p className="font-medium text-fg">{t("empty.title")}</p>
                  <p className="text-sm text-fg-muted">{t("empty.body")}</p>
                </div>
              </div>
            ) : (
              <div
                role="rowgroup"
                className="relative"
                style={{ height: virtualizer.getTotalSize() }}
              >
                {items.map((item) => {
                  const row = tableRows[item.index];
                  if (!row) return null;
                  return (
                    <div
                      role="row"
                      aria-rowindex={item.index + 2}
                      key={row.id}
                      data-testid="tx-row"
                      className={`${GRID} absolute inset-x-0 top-0 items-center gap-4 border-b border-border px-4 hover:bg-surface-muted/60`}
                      style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <div role="cell" key={cell.id} className="min-w-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <p className="border-t border-border px-4 py-2 text-xs text-fg-muted" aria-live="polite">
          {isFetchingNextPage
            ? t("loadingMore")
            : !hasNextPage && tableRows.length > 0
              ? t("endOfList")
              : " "}
        </p>
      </div>
    </div>
  );
}
