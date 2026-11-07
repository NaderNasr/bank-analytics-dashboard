/**
 * Seeds the database with the deterministic demo customer.
 *
 *   npm run db:seed                      # default seed and end date
 *   npm run db:seed -- --end 2027-01-01  # shift the 18-month window
 *
 * Destructive: truncates every table first. Reads DATABASE_URL_UNPOOLED (Neon's direct URL) or
 * DATABASE_URL from .env.local or the environment.
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";

import { migrationDatabaseUrl, parseServerEnv } from "@/lib/env";

import { createDb } from "../client";
import { accounts, categories, merchants, transactions, users } from "../schema";
import { CATEGORIES } from "./catalog";
import { DEFAULT_SEED_OPTIONS, generateSeedData } from "./generate";

const BATCH_SIZE = 1_000;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  config({ path: ".env.local", quiet: true });
  const env = parseServerEnv(process.env);
  const endDate = argValue("--end") ?? DEFAULT_SEED_OPTIONS.endDate;
  const seed = Number(argValue("--seed") ?? DEFAULT_SEED_OPTIONS.seed);

  const started = Date.now();
  const email = process.env.DEMO_USER_EMAIL || DEFAULT_SEED_OPTIONS.email;
  const data = generateSeedData({ seed, endDate, email });
  console.log(
    `Generated ${data.transactions.length} transactions (seed ${seed}, ending ${endDate}, user ${email}).`,
  );

  const db = createDb(migrationDatabaseUrl(env), { max: 1 });
  try {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`TRUNCATE ${transactions}, ${merchants}, ${accounts}, ${users}, ${categories} RESTART IDENTITY CASCADE`,
      );

      const insertedCategories = await tx
        .insert(categories)
        .values(CATEGORIES.map((c) => ({ slug: c.slug, kind: c.kind })))
        .returning({ id: categories.id, slug: categories.slug });
      const categoryId = new Map(insertedCategories.map((c) => [c.slug, c.id]));
      const idFor = (slug: string) => {
        const id = categoryId.get(slug);
        if (id === undefined) throw new Error(`Unknown category slug: ${slug}`);
        return id;
      };

      await tx.insert(users).values(data.user);
      await tx.insert(accounts).values(data.accounts.map(({ key: _key, ...a }) => a));
      await tx.insert(merchants).values(
        data.merchants.map(({ categorySlug, ...m }) => ({
          ...m,
          defaultCategoryId: idFor(categorySlug),
        })),
      );

      const rows = data.transactions
        .toSorted((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
        .map(({ categorySlug, ...t }) => ({ ...t, categoryId: idFor(categorySlug) }));
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await tx.insert(transactions).values(rows.slice(i, i + BATCH_SIZE));
      }
    });
    await db.execute(sql`ANALYZE`);
    console.log(`Seeded in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  } finally {
    await db.$client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
