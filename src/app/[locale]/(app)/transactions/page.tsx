import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { TransactionsExplorer } from "@/features/transactions/transactions-explorer";
import { isLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/transactions">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: isLocale(locale) ? locale : "en",
    namespace: "Transactions",
  });
  return { title: t("title") };
}

/** The explorer reads its filters from the URL, so it renders behind a Suspense boundary. */
export default async function TransactionsPage({ params }: PageProps<"/[locale]/transactions">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface-muted" />}>
      <TransactionsExplorer />
    </Suspense>
  );
}
