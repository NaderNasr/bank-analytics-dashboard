import type { NextAuthRequest } from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { safeCallbackUrl, SIGN_IN_PATH, signInUrlFor } from "@/lib/auth/callback-url";
import { auth } from "@/server/auth";

/**
 * Gatekeeper for every page and API route. Anonymous page requests go to the sign-in page with a
 * callback; anonymous API requests get a JSON 401 (an API client cannot follow a redirect to a
 * form). Signed-in users visiting the sign-in page are sent on to where they were going.
 *
 * Route handlers check the session again (see withUser), so this is not the only line of defence.
 */
function gate(request: NextAuthRequest, _event: NextFetchEvent) {
  const { pathname, search, searchParams } = request.nextUrl;
  const signedIn = Boolean(request.auth?.user?.id);

  if (pathname.startsWith("/api/")) {
    if (signedIn) return NextResponse.next();
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in to use this API." } },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (pathname === SIGN_IN_PATH) {
    if (!signedIn) return NextResponse.next();
    const target = safeCallbackUrl(searchParams.get("callbackUrl"));
    return NextResponse.redirect(new URL(target, request.nextUrl.origin));
  }

  if (signedIn) return NextResponse.next();
  const signInUrl = signInUrlFor(`${pathname}${search}`);
  return NextResponse.redirect(new URL(signInUrl, request.nextUrl.origin));
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
