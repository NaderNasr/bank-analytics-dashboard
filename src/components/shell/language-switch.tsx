"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/routing";

/** Swaps between English and Arabic on the same page, keeping the query string. */
export function LanguageSwitch() {
  const t = useTranslations("Shell");
  const locale = useLocale() as Locale;
  const other = LOCALES.find((l) => l !== locale) ?? "en";
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchLocale() {
    const query = Object.fromEntries(new URLSearchParams(window.location.search));
    startTransition(() => router.replace({ pathname, query }, { locale: other }));
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={pending}
      lang={other}
      aria-label={t("switchToLabel")}
      className="inline-flex h-11 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-muted hover:text-fg disabled:opacity-60 sm:h-9"
    >
      <Languages aria-hidden className="size-[18px]" />
      {t("switchTo")}
    </button>
  );
}
