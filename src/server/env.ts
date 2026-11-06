import "server-only";

import { parseAuthEnv, parseServerEnv, type AuthEnv, type ServerEnv } from "@/lib/env";

let cachedServer: ServerEnv | undefined;
let cachedAuth: AuthEnv | undefined;

/**
 * Validated on first use rather than at import, so `next build` (which imports every route to
 * collect its config) works without a database. A bad value still fails the first request loudly.
 */
export function getServerEnv(): ServerEnv {
  cachedServer ??= parseServerEnv(process.env);
  return cachedServer;
}

export function getAuthEnv(): AuthEnv {
  cachedAuth ??= parseAuthEnv(process.env);
  return cachedAuth;
}
