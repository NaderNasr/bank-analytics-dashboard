import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/shell/page-header";
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

export default async function TransactionsPage({ params }: PageProps<"/[locale]/transactions">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Transactions");
  return <PageHeader title={t("title")} description={t("comingSoon")} />;
}
