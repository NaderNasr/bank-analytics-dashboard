import { relations, sql } from "drizzle-orm";
import {
  bigint,
  char,
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Retail banking demo schema.
 *
 * Money is stored as integer minor units in `bigint` columns, read as JS numbers. The exponent comes
 * from the currency: JOD has 3 decimals, so 1 JOD = 1000 fils. Amounts are always positive;
 * `direction` says which way the money moved. See DECISIONS.md 002.
 *
 * Status semantics:
 * - posted   – settled; counts towards the balance.
 * - pending  – authorised, not yet settled; shown, but not in the balance.
 * - failed   – declined; no money moved.
 * - reversed – settled, then cancelled by the bank (e.g. a duplicate charge); net zero, excluded.
 * A merchant refund is a separate posted credit whose `refund_of_id` points at the purchase.
 * Balance = opening balance + posted credits − posted debits.
 */

// ── Enums ────────────────────────────────────────────────────────────────────

export const accountType = pgEnum("account_type", ["current", "savings", "card"]);

export const txnDirection = pgEnum("txn_direction", ["debit", "credit"]);

export const txnStatus = pgEnum("txn_status", ["pending", "posted", "failed", "reversed"]);

export const txnChannel = pgEnum("txn_channel", [
  "card_present",
  "online",
  "transfer",
  "direct_debit",
  "standing_order",
  "atm",
]);

export const categoryKind = pgEnum("category_kind", ["income", "expense", "transfer"]);

// ── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: accountType("type").notNull(),
    name: text("name").notNull(),
    /** Display-safe identifier, e.g. "•••• 4821". The full number is never stored. */
    maskedNumber: text("masked_number").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    /** Balance before the first seeded transaction. Current balance is derived, never stored. */
    openingBalanceMinor: bigint("opening_balance_minor", { mode: "number" }).notNull().default(0),
    /** Card accounts only. */
    creditLimitMinor: bigint("credit_limit_minor", { mode: "number" }),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("accounts_user_idx").on(t.userId),
    check(
      "accounts_credit_limit_only_on_cards",
      sql`(${t.type} = 'card') = (${t.creditLimitMinor} IS NOT NULL)`,
    ),
  ],
);

export const categories = pgTable("categories", {
  id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
  /** Stable key used in URLs, filters and i18n message ids, e.g. "groceries". */
  slug: text("slug").notNull().unique(),
  kind: categoryKind("kind").notNull(),
});

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    defaultCategoryId: smallint("default_category_id")
      .notNull()
      .references(() => categories.id),
    /** ISO 3166-1 alpha-2. */
    country: char("country", { length: 2 }).notNull(),
  },
  (t) => [uniqueIndex("merchants_name_uq").on(t.name)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    direction: txnDirection("direction").notNull(),
    status: txnStatus("status").notNull(),
    channel: txnChannel("channel").notNull(),
    categoryId: smallint("category_id")
      .notNull()
      .references(() => categories.id),
    /** Null for salary, transfers between own accounts, interest, fees. */
    merchantId: uuid("merchant_id").references(() => merchants.id),
    description: text("description").notNull(),
    /** Bank reference shown on statements. */
    reference: text("reference").notNull().unique(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    /** Null while pending and for failed transactions. */
    postedAt: timestamp("posted_at", { withTimezone: true }),
    /** Links the two legs of a transfer between the customer's own accounts. */
    transferGroupId: uuid("transfer_group_id"),
    /** Set on a merchant refund (a posted credit): points at the purchase it refunds. */
    refundOfId: uuid("refund_of_id"),
  },
  (t) => [
    check("transactions_amount_positive", sql`${t.amountMinor} > 0`),
    foreignKey({
      name: "transactions_refund_of_fk",
      columns: [t.refundOfId],
      foreignColumns: [t.id],
    }),
    // Explorer default view: one account, newest first; also the keyset pagination key.
    index("transactions_account_occurred_idx").on(t.accountId, t.occurredAt.desc(), t.id),
    // "All accounts" view and date-range filters.
    index("transactions_occurred_idx").on(t.occurredAt.desc(), t.id),
    index("transactions_category_idx").on(t.categoryId),
    index("transactions_merchant_idx").on(t.merchantId),
    index("transactions_amount_idx").on(t.amountMinor),
    // Status filter is mostly used to find the rare failed/reversed rows.
    index("transactions_status_idx")
      .on(t.status)
      .where(sql`${t.status} <> 'posted'`),
    // Substring search on description (requires the pg_trgm extension).
    index("transactions_description_trgm_idx").using("gin", sql`${t.description} gin_trgm_ops`),
  ],
);

// ── Relations (for Drizzle's relational query API) ──────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  merchants: many(merchants),
}));

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  defaultCategory: one(categories, {
    fields: [merchants.defaultCategoryId],
    references: [categories.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  merchant: one(merchants, { fields: [transactions.merchantId], references: [merchants.id] }),
  refundOf: one(transactions, {
    fields: [transactions.refundOfId],
    references: [transactions.id],
  }),
}));

// ── Inferred types ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Merchant = typeof merchants.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
