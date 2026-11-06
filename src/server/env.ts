import "server-only";

import { parseServerEnv } from "@/lib/env";

export const env = parseServerEnv(process.env);
