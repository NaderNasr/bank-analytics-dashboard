import "server-only";

import { parseServerEnv, type ServerEnv } from "@/lib/env";

let cached: ServerEnv | undefined;

/**
 * Validated on first use rather than at import, so `next build` (which imports every route to
 * collect its config) works without a database. A bad value still fails the first request loudly.
 */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
