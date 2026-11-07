"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { applyTheme, nextTheme, readTheme, type Theme } from "./theme";

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
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
    listeners.forEach((l) => l());
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
