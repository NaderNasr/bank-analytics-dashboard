import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { MarketsBoard } from "@/features/markets/markets-board";
import { isLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/markets">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: isLocale(locale) ? locale : "en",
    namespace: "Markets",
  });
  return { title: t("title") };
}

/** The board connects from the browser; the server only renders the shell. */
export default async function MarketsPage({ params }: PageProps<"/[locale]/markets">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MarketsBoard />;
}
