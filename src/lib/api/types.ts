/** Response shapes shared by the route handlers and the client. Money is always in minor units. */

export const TRANSACTION_STATUSES = ["pending", "posted", "failed", "reversed"] as const;
export const TRANSACTION_DIRECTIONS = ["debit", "credit"] as const;
export const TRANSACTION_CHANNELS = [
  "card_present",
  "online",
  "transfer",
  "direct_debit",
  "standing_order",
  "atm",
] as const;
export const ACCOUNT_TYPES = ["current", "savings", "card"] as const;
export const CATEGORY_KINDS = ["income", "expense", "transfer"] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];
export type TransactionChannel = (typeof TRANSACTION_CHANNELS)[number];
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export interface ApiError {
  error: {
    code: "invalid_query" | "not_found" | "unauthorized" | "internal_error";
    message: string;
    issues?: { path: string; message: string }[];
  };
}

export interface AccountSummary {
  id: string;
  name: string;
  type: AccountType;
  maskedNumber: string;
  currency: string;
  balanceMinor: number;
  /** Spendable now: the balance, or for cards the unused credit. */
  availableMinor: number;
  creditLimitMinor: number | null;
}

export interface AccountsResponse {
  data: AccountSummary[];
}

export interface TransactionListItem {
  id: string;
  occurredAt: string;
  postedAt: string | null;
  description: string;
  reference: string;
  amountMinor: number;
  currency: string;
  direction: TransactionDirection;
  status: TransactionStatus;
  channel: TransactionChannel;
  category: { slug: string; kind: CategoryKind };
  merchant: { id: string; name: string } | null;
  account: { id: string; name: string; type: AccountType };
}

export interface TransactionListResponse {
  data: TransactionListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TransactionDetail extends TransactionListItem {
  merchant: { id: string; name: string; country: string } | null;
  transferGroupId: string | null;
  /** For a refund: the purchase it refunds. */
  refundOf: TransactionListItem | null;
  /** For a purchase: refunds issued against it. */
  refunds: TransactionListItem[];
  /** For a transfer between own accounts: the other leg. */
  counterpart: TransactionListItem | null;
}

export interface TransactionDetailResponse {
  data: TransactionDetail;
}

export interface Kpis {
  incomeMinor: number;
  /** Expense debits minus refunds. Transfers between own accounts are excluded. */
  spendingMinor: number;
  netMinor: number;
  /** net / income, or null when there was no income. */
  savingsRate: number | null;
  transactionCount: number;
  averageDailySpendingMinor: number;
  failedCount: number;
  pendingCount: number;
}

export interface SummaryResponse {
  currency: string;
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  balances: { totalMinor: number; accounts: AccountSummary[] };
  kpis: Kpis;
  /** Null when the previous period starts before the user's first transaction. */
  previousKpis: Kpis | null;
  /** One entry per month in the range, oldest first, including empty months. */
  cashFlow: { month: string; incomeMinor: number; spendingMinor: number }[];
  /** Gross expense debits by category, largest first. */
  spendingByCategory: { slug: string; amountMinor: number; count: number; share: number }[];
  /** One entry per day with spending, oldest first (for the calendar heatmap). */
  dailySpending: { date: string; amountMinor: number; count: number }[];
  topMerchants: { id: string; name: string; amountMinor: number; count: number }[];
}
