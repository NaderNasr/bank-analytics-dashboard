import {
  parseTransactionsQuery,
  TRANSACTION_SORT_FIELDS,
  type TransactionSortField,
} from "@/lib/api/transactions-query";
import {
  TRANSACTION_DIRECTIONS,
  TRANSACTION_STATUSES,
  type TransactionDirection,
  type TransactionStatus,
} from "@/lib/api/types";

/**
 * The explorer's state lives in the URL, so a filtered view can be bookmarked, shared and
 * survives a reload. These helpers are the only place that maps between the two, and they keep
 * the URL canonical: defaults are omitted and keys come out in a fixed order.
 */
export interface ExplorerFilters {
  q?: string;
  from?: string;
  to?: string;
  category?: string;
  account?: string;
  status?: TransactionStatus;
  direction?: TransactionDirection;
  sort: TransactionSortField;
  order: "asc" | "desc";
}

export const DEFAULT_SORT: Pick<ExplorerFilters, "sort" | "order"> = {
  sort: "occurredAt",
  order: "desc",
};

const FILTER_KEYS = ["q", "from", "to", "category", "account", "status", "direction"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

/** Reads the URL leniently: an invalid value is dropped instead of breaking the page. */
export function filtersFromSearchParams(params: URLSearchParams): ExplorerFilters {
  const pick = (key: string) => params.get(key)?.trim() || undefined;
  const filters: ExplorerFilters = { ...DEFAULT_SORT };

  for (const key of FILTER_KEYS) {
    const value = pick(key);
    if (value === undefined) continue;
    const check = parseTransactionsQuery(new URLSearchParams({ [key]: value }));
    if (!check.success) continue;
    if (key === "status") {
      if ((TRANSACTION_STATUSES as readonly string[]).includes(value))
        filters.status = value as TransactionStatus;
    } else if (key === "direction") {
      if ((TRANSACTION_DIRECTIONS as readonly string[]).includes(value))
        filters.direction = value as TransactionDirection;
    } else {
      filters[key] = value;
    }
  }
  if (filters.from && filters.to && filters.from > filters.to) delete filters.to;

  const sort = pick("sort");
  if (sort && (TRANSACTION_SORT_FIELDS as readonly string[]).includes(sort)) {
    filters.sort = sort as TransactionSortField;
  }
  const order = pick("order");
  if (order === "asc" || order === "desc") filters.order = order;
  return filters;
}

/** Canonical query string for the page URL and the API (without pagination). */
export function toSearchParams(filters: ExplorerFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  if (filters.sort !== DEFAULT_SORT.sort || filters.order !== DEFAULT_SORT.order) {
    params.set("sort", filters.sort);
    params.set("order", filters.order);
  }
  return params;
}

export function activeFilterCount(filters: ExplorerFilters): number {
  return FILTER_KEYS.filter((key) => filters[key]).length;
}

/** Clicking a column header: a new column sorts descending first; the same column flips. */
export function nextSort(
  filters: ExplorerFilters,
  field: TransactionSortField,
): Pick<ExplorerFilters, "sort" | "order"> {
  if (filters.sort !== field)
    return { sort: field, order: field === "description" ? "asc" : "desc" };
  return { sort: field, order: filters.order === "desc" ? "asc" : "desc" };
}
