import "server-only";

import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import type { z } from "zod";

import type { ApiError } from "@/lib/api/types";
import { getSessionUserId } from "@/server/auth";

const NO_STORE = { "Cache-Control": "private, no-store" };

export function json<T>(body: T, init: ResponseInit = {}) {
  return NextResponse.json(body, { ...init, headers: { ...NO_STORE, ...init.headers } });
}

export function errorResponse(
  status: number,
  code: ApiError["error"]["code"],
  message: string,
  issues?: ApiError["error"]["issues"],
) {
  return json<ApiError>({ error: { code, message, ...(issues ? { issues } : {}) } }, { status });
}

export function invalidQuery(error: z.ZodError) {
  return errorResponse(
    400,
    "invalid_query",
    "One or more query parameters are invalid.",
    error.issues.map((i) => ({ path: i.path.join(".") || "(root)", message: i.message })),
  );
}

export function unauthorized() {
  return errorResponse(401, "unauthorized", "Sign in to use this API.");
}

/**
 * Resolves the signed-in user and turns unexpected failures into a JSON 500 instead of an HTML
 * page. The proxy already rejects anonymous API calls; this check is the second line of defence,
 * so a matcher change can never expose data.
 */
export async function withUser(handler: (userId: string) => Promise<Response>) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();
    return await handler(userId);
  } catch (error) {
    // Let Next's own control-flow signals through (prerender bail-outs, redirects, notFound).
    unstable_rethrow(error);
    console.error(error);
    return errorResponse(500, "internal_error", "Something went wrong. Please try again.");
  }
}
