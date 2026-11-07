import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";

import { Brand } from "./brand";
import { LanguageSwitch } from "./language-switch";
import { MobileNav } from "./mobile-nav";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu, UserMenuFallback } from "./user-menu";

/**
 * Sidebar + top bar around every signed-in page. Laid out with a CSS grid and logical properties
 * only, so the sidebar sits on the inline-start side: left in English, right in Arabic.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("Shell");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm font-medium text-fg shadow-overlay focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t("skipToContent")}
      </a>

      <aside
        data-testid="sidebar"
        className="sticky top-0 hidden h-dvh flex-col gap-8 border-e border-nav-edge bg-nav px-3 py-5 lg:flex"
      >
        <div className="px-3">
          <Brand />
        </div>
        <SidebarNav />
        <p className="mt-auto flex items-center gap-2 px-3 text-xs text-nav-muted">
          <Lock aria-hidden className="size-3.5 text-gold-accent" />
          {t("secureSession")}
        </p>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-bg/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-bg/75 lg:px-6">
          <MobileNav />
          <span className="hidden text-xs font-medium text-fg-muted sm:inline">
            {t("demoData")}
          </span>
          <div className="ms-auto flex items-center gap-1">
            <LanguageSwitch />
            <ThemeToggle />
            <span aria-hidden className="mx-2 h-6 w-px bg-border" />
            <Suspense fallback={<UserMenuFallback />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
