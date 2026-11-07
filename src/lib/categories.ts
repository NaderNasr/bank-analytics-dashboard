import type { CategoryKind } from "@/lib/api/types";

/** Category slugs as seeded, in display order. Kept in sync with the seed by a test. */
export const CATEGORY_OPTIONS: readonly { slug: string; kind: CategoryKind }[] = [
  { slug: "salary", kind: "income" },
  { slug: "interest", kind: "income" },
  { slug: "refunds", kind: "income" },
  { slug: "rent", kind: "expense" },
  { slug: "groceries", kind: "expense" },
  { slug: "dining", kind: "expense" },
  { slug: "coffee", kind: "expense" },
  { slug: "transport", kind: "expense" },
  { slug: "fuel", kind: "expense" },
  { slug: "utilities", kind: "expense" },
  { slug: "telecom", kind: "expense" },
  { slug: "subscriptions", kind: "expense" },
  { slug: "shopping", kind: "expense" },
  { slug: "health", kind: "expense" },
  { slug: "entertainment", kind: "expense" },
  { slug: "travel", kind: "expense" },
  { slug: "education", kind: "expense" },
  { slug: "cash", kind: "expense" },
  { slug: "fees", kind: "expense" },
  { slug: "transfers", kind: "transfer" },
];
