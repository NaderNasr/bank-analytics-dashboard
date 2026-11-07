"use client";

import { useEffect } from "react";

import { applyTheme, storedTheme } from "./theme";

/**
 * The inline theme script applies the saved theme before first paint. If React later re-renders
 * the root element (for example when a host streams the page differently and hydration falls
 * back to a client render), the attribute it set can be dropped. This re-applies the saved
 * choice once the app has hydrated, so it always sticks.
 */
export function ThemeSync() {
  useEffect(() => {
    applyTheme(storedTheme());
  }, []);
  return null;
}
