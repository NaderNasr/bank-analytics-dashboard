export const SIGN_IN_PATH = "/sign-in";
export const DEFAULT_AFTER_SIGN_IN = "/";

const BASE = "http://internal.invalid";

/**
 * Turns an untrusted `callbackUrl` into a same-origin path, so the sign-in page cannot be used as
 * an open redirect (`//evil.com`, `/\evil.com`, `https://evil.com`, `javascript:`…). Anything
 * suspicious falls back to the dashboard.
 */
export function safeCallbackUrl(value: unknown, fallback: string = DEFAULT_AFTER_SIGN_IN): string {
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
  if (url.pathname === SIGN_IN_PATH || url.pathname.startsWith("/api/auth")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** `/sign-in?callbackUrl=…` for a request that needs a session. */
export function signInUrlFor(pathWithSearch: string): string {
  const target = safeCallbackUrl(pathWithSearch);
  return target === DEFAULT_AFTER_SIGN_IN
    ? SIGN_IN_PATH
    : `${SIGN_IN_PATH}?${new URLSearchParams({ callbackUrl: target }).toString()}`;
}
