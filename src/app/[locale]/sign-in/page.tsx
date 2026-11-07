import { Lock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { Brand } from "@/components/shell/brand";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signInAction } from "@/features/auth/actions";
import { SignInForm } from "@/features/auth/sign-in-form";
import { signInErrorFromQuery } from "@/features/auth/sign-in-state";
import { isLocale } from "@/i18n/routing";
import { homePath, safeCallbackUrl } from "@/lib/auth/callback-url";
import { getAuthEnv } from "@/server/env";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-in">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: isLocale(locale) ? locale : "en",
    namespace: "SignIn",
  });
  return { title: t("title") };
}

export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tShell] = await Promise.all([getTranslations("SignIn"), getTranslations("Shell")]);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand panel: navy for security, a single gold line for loyalty. */}
      <section
        aria-hidden
        className="relative hidden flex-col justify-between overflow-hidden border-e border-nav-edge bg-nav p-10 text-on-nav lg:flex"
      >
        <Brand />
        <div className="flex max-w-sm flex-col gap-4">
          <ShieldCheck className="size-10 text-gold-accent" />
          <p className="text-2xl leading-snug font-semibold">{t("subtitle")}</p>
          <span className="h-0.5 w-16 rounded-full bg-gold-accent" />
        </div>
        <p className="flex items-center gap-2 text-xs text-nav-muted">
          <Lock className="size-3.5 text-gold-accent" />
          {tShell("secureSession")}
        </p>
      </section>

      <main className="flex flex-col">
        <div className="flex items-center justify-end gap-1 p-4">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">{t("title")}</h1>
            <p className="mt-1 mb-8 text-sm text-fg-muted">{t("subtitle")}</p>
            <Suspense fallback={<div className="h-96" aria-hidden />}>
              <SignInSection locale={locale} searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Reads the query and env at request time, so it streams in behind the static shell. */
async function SignInSection({
  locale,
  searchParams,
}: {
  locale: string;
  searchParams: PageProps<"/[locale]/sign-in">["searchParams"];
}) {
  const params = await searchParams;
  const env = getAuthEnv();
  const safeLocale = isLocale(locale) ? locale : "en";
  return (
    <SignInForm
      action={signInAction}
      locale={safeLocale}
      callbackUrl={safeCallbackUrl(params.callbackUrl, homePath(safeLocale))}
      initialError={signInErrorFromQuery(params.error)}
      demo={{ email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD }}
    />
  );
}
