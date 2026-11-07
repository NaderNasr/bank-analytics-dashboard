"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { applyTheme, nextTheme, readTheme, THEME_EVENT, type Theme } from "./theme";

function subscribe(listener: () => void) {
  document.documentElement.addEventListener(THEME_EVENT, listener);
  return () => document.documentElement.removeEventListener(THEME_EVENT, listener);
}

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;
const LABEL_KEYS = { system: "themeSystem", light: "themeLight", dark: "themeDark" } as const;

/** Cycles System → Light → Dark. The server renders "System"; the real value appears on hydrate. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const t = useTranslations("Shell");
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => "system");
  const Icon = ICONS[theme];

  function cycle() {
    applyTheme(nextTheme(theme));
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${t("theme")}: ${t(LABEL_KEYS[theme])}`}
      title={`${t("theme")}: ${t(LABEL_KEYS[theme])}`}
      className={`inline-flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors duration-150 hover:bg-surface-muted hover:text-fg sm:size-9 ${className}`}
    >
      <Icon aria-hidden className="size-[18px]" />
    </button>
  );
}
