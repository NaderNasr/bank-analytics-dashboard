import { LogOut } from "lucide-react";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";

import { signOutAction } from "@/features/auth/actions";
import { auth } from "@/server/auth";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Reads the session, so it renders behind a Suspense boundary in the shell. */
export async function UserMenu() {
  // Per-request data: keep it out of partial prefetches (Auth.js uses crypto randomness when it
  // reads the session, which a prefetch prerender rejects).
  await connection();
  const [session, t, locale] = await Promise.all([auth(), getTranslations("Shell"), getLocale()]);
  const name = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <div className="flex items-center gap-3">
      <span className="hidden flex-col items-end leading-tight sm:flex">
        <span className="text-sm font-medium text-fg">{name}</span>
        <span className="text-xs font-medium text-gold">{t("member")}</span>
      </span>
      <span
        aria-hidden
        className="inline-flex size-9 items-center justify-center rounded-full bg-gold-soft text-xs font-semibold text-on-gold-soft ring-1 ring-gold-accent/40"
      >
        {initials(name)}
      </span>
      <form action={signOutAction}>
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          aria-label={t("signOut")}
          title={t("signOut")}
          className="press inline-flex size-11 items-center justify-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg sm:size-9"
        >
          <LogOut aria-hidden className="size-[18px] rtl:-scale-x-100" />
        </button>
      </form>
    </div>
  );
}

export function UserMenuFallback() {
  return <span aria-hidden className="size-9 animate-pulse rounded-full bg-surface-muted" />;
}
