"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

import { isActive, NAV_ITEMS } from "./nav-items";

/** Primary navigation. The active item gets aria-current and a gold bar on its inline-start edge. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")}>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? "bg-nav-hover text-on-nav before:absolute before:inset-y-2 before:start-0 before:w-[3px] before:rounded-full before:bg-gold-accent"
                    : "text-nav-muted hover:bg-nav-hover hover:text-on-nav"
                }`}
              >
                <Icon aria-hidden className="size-[18px] shrink-0" />
                {t(labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
