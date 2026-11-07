import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { isLocale } from "@/i18n/routing";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/server/auth";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: isLocale(locale) ? locale : "en",
    namespace: "Overview",
  });
  return { title: t("title") };
}

// The overview dashboard (KPIs, charts, heatmap) replaces the placeholder card in Phase 4.
export default async function OverviewPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Overview");

  return (
    <>
      <PageHeader title={t("title")} description={t("comingSoon")} />
      <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-surface-muted" />}>
        <Welcome locale={locale} />
      </Suspense>
    </>
  );
}

async function Welcome({ locale }: { locale: string }) {
  const [session, t] = await Promise.all([auth(), getTranslations("Overview")]);
  // The proxy normally handles this; checking again keeps the page safe on its own.
  if (!session?.user) redirect({ href: "/sign-in", locale: isLocale(locale) ? locale : "en" });
  const name = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <section className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-on-gold-soft">
        <ShieldCheck aria-hidden className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-fg">{t("greeting", { name })}</h2>
        <p className="text-sm text-fg-muted">{t("signedInAs", { name })}</p>
      </div>
    </section>
  );
}
