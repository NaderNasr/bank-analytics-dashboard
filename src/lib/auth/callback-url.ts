import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "@/i18n/routing";

const BASE = "http://internal.invalid";
const LOCALE_PATTERN = LOCALES.join("|");
const SIGN_IN_RE = new RegExp(`^(?:/(?:${LOCALE_PATTERN}))?/sign-in/?$`);
const LOCALE_PREFIX_RE = new RegExp(`^/(${LOCALE_PATTERN})(?=/|$)`);

export function signInPath(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}/sign-in`;
}

export function homePath(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}`;
}

export function isSignInPath(pathname: string): boolean {
  return SIGN_IN_RE.test(pathname);
}

/** The locale a path starts with, e.g. "/ar/transactions" → "ar", or null. */
export function localeOfPath(pathname: string): Locale | null {
  const match = LOCALE_PREFIX_RE.exec(pathname)?.[1];
  return isLocale(match) ? match : null;
}

/**
 * Turns an untrusted `callbackUrl` into a same-origin path, so the sign-in page cannot be used as
 * an open redirect (`//evil.com`, `/\evil.com`, `https://evil.com`, `javascript:`…). Anything
 * suspicious falls back to the dashboard.
 */
export function safeCallbackUrl(value: unknown, fallback: string = homePath()): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;
  // Only plain absolute paths. Browsers treat "//" and "/\" as protocol-relative URLs.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  if (isSignInPath(url.pathname) || url.pathname.startsWith("/api/")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** `/{locale}/sign-in?callbackUrl=…` for a request that needs a session. */
export function signInUrlFor(pathWithSearch: string, locale: Locale = DEFAULT_LOCALE): string {
  const target = safeCallbackUrl(pathWithSearch, "");
  if (target === "" || target === homePath(locale)) return signInPath(locale);
  return `${signInPath(locale)}?${new URLSearchParams({ callbackUrl: target }).toString()}`;
}
