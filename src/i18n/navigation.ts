import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/** Locale-aware Link, redirect and hooks: `href="/transactions"` resolves to /en/... or /ar/.... */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
