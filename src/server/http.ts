import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import type { ApiError } from "@/lib/api/types";
import { getCurrentUserId } from "@/server/current-user";

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

/** Resolves the user and turns unexpected failures into a JSON 500 instead of an HTML page. */
export async function withUser(handler: (userId: string) => Promise<Response>) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return errorResponse(401, "unauthorized", "No user for this request.");
    return await handler(userId);
  } catch (error) {
    console.error(error);
    return errorResponse(500, "internal_error", "Something went wrong. Please try again.");
  }
}
