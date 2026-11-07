import type { NextAuthRequest } from "next-auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import {
  homePath,
  isSignInPath,
  localeOfPath,
  safeCallbackUrl,
  signInUrlFor,
} from "@/lib/auth/callback-url";
import { auth } from "@/server/auth";

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
 */
function gate(request: NextAuthRequest, _event: NextFetchEvent) {
  const { pathname, search, searchParams, origin } = request.nextUrl;
  const signedIn = Boolean(request.auth?.user?.id);

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

/**
 * Next statically checks for a function export, so the Auth.js wrapper is called from one. With a
 * lazily built config, `auth(gate)` resolves to the wrapper asynchronously (its types say
 * otherwise), hence the await.
 */
export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const withSession = await auth(gate);
  return withSession(request, event);
}

export const config = {
  // Everything except Auth.js's own endpoints, Next internals and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
