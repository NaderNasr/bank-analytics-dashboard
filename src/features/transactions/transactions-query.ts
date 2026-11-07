import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { getJson } from "@/components/providers/query-provider";
import type { AccountsResponse, TransactionListResponse } from "@/lib/api/types";

export const PAGE_SIZE = 100;

/** `qs` is the canonical filter string from toSearchParams, so equal views share a cache entry. */
export function transactionsQuery(qs: string) {
  return infiniteQueryOptions({
    queryKey: ["transactions", qs],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getJson<TransactionListResponse>(
        `/api/transactions?${qs ? `${qs}&` : ""}page=${pageParam}&pageSize=${PAGE_SIZE}`,
        signal,
      ),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}

export const accountsQuery = queryOptions({
  queryKey: ["accounts"],
  queryFn: ({ signal }) => getJson<AccountsResponse>("/api/accounts", signal),
  staleTime: 5 * 60_000,
});
