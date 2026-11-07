import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { OverviewDashboard } from "@/features/overview/overview-dashboard";
import { isLocale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: isLocale(locale) ? locale : "en",
    namespace: "Overview",
  });
  return { title: t("title") };
}

/** The shell and skeleton prerender; the data loads on the client through TanStack Query. */
export default async function OverviewPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OverviewDashboard />;
}
