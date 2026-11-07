export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_STORAGE_KEY = "theme";

/**
 * Runs in <head> before first paint so an explicit choice never flashes the other theme.
 * "system" removes the attribute and lets prefers-color-scheme decide (tokens.css).
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export function nextTheme(current: Theme): Theme {
  const i = THEMES.indexOf(current);
  return THEMES[(i + 1) % THEMES.length] ?? "system";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this page only.
  }
}

export function readTheme(): Theme {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "light" || value === "dark" ? value : "system";
}
