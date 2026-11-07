import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import {
  homePath,
  isSignInPath,
  localeOfPath,
  safeCallbackUrl,
  signInUrlFor,
} from "@/lib/auth/callback-url";
import { getAuthEnv } from "@/server/env";

const intl = createIntlMiddleware(routing);

/**
 * Gatekeeper for every page and API route.
 *
 * - API: anonymous calls get a JSON 401 (an API client cannot follow a redirect to a form).
 * - Pages without a locale (`/`, `/transactions`): next-intl redirects to /en/… or /ar/…, picked
 *   from the NEXT_LOCALE cookie or Accept-Language. Auth runs on the follow-up request.
 * - Sign-in page: anonymous users see it; signed-in users go on to their callback.
 * - Anything else needs a session, or redirects to /{locale}/sign-in?callbackUrl=….
 *
 * Route handlers and pages check the session again, so this is not the only line of defence.
 *
 * The session is only *read* here (decrypt and check expiry), never re-issued. Auth.js's own
 * middleware wrapper refreshes the cookie on every request, and a request still in flight during
 * sign-out would then set the cookie again after sign-out cleared it, silently signing the user
 * back in. Not rolling also gives sessions a fixed lifetime from sign-in (8 hours).
 */
export default async function proxy(request: NextRequest) {
  const { pathname, search, searchParams, origin } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: getAuthEnv().AUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });
  const signedIn = Boolean(token?.sub);

  if (pathname.startsWith("/api/")) {
    if (signedIn) return NextResponse.next();
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in to use this API." } },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const locale = localeOfPath(pathname);
  if (!locale) return intl(request);

  if (isSignInPath(pathname)) {
    if (!signedIn) return intl(request);
    const target = safeCallbackUrl(searchParams.get("callbackUrl"), homePath(locale));
    return NextResponse.redirect(new URL(target, origin));
  }

  if (signedIn) return intl(request);
  return NextResponse.redirect(new URL(signInUrlFor(`${pathname}${search}`, locale), origin));
}

export const config = {
  // Everything except Auth.js's own endpoints, Next internals and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
