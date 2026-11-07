import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The UI must mirror correctly in Arabic, so layout uses logical properties only (start/end,
 * inline/block). This guard fails on physical left/right utilities and CSS properties.
 * Direction-specific tweaks are still possible with the `rtl:`/`ltr:` variants.
 */
const ROOT = join(process.cwd(), "src");

const TAILWIND_PHYSICAL =
  /(?<![\w:-])(?:[a-z-]+:)*-?(?:m[lr]|p[lr]|scroll-m[lr]|scroll-p[lr]|left|right|border-[lr]|rounded-[lr]|rounded-[tb][lr]|text-(?:left|right)|float-(?:left|right)|clear-(?:left|right))(?:-[\w./[\]%-]+)?(?![\w-])/g;
const CSS_PHYSICAL =
  /\b(?:margin|padding|border)-(?:left|right)\b|(?<![\w-])(?:left|right)\s*:|text-align\s*:\s*(?:left|right)|float\s*:\s*(?:left|right)/g;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx|css)$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

/** Strings that can hold class names: quoted strings and template literals. */
function classStrings(source: string): string[] {
  return [...source.matchAll(/"([^"\n]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? "");
}

describe("logical properties only", () => {
  const sources = files(ROOT);

  it("finds the UI sources", () => {
    expect(sources.length).toBeGreaterThan(5);
  });

  it.each(sources.map((p) => [relative(ROOT, p), p]))("%s", (_name, path) => {
    const source = readFileSync(path, "utf8");
    const hits = path.endsWith(".css")
      ? [...source.matchAll(CSS_PHYSICAL)].map((m) => m[0])
      : classStrings(source)
          .flatMap((s) => s.split(/\s+/))
          .filter((token) => /^[\w:[\]./%-]+$/.test(token))
          .filter((token) => new RegExp(`^${TAILWIND_PHYSICAL.source}$`).test(token));
    expect(hits, "use start/end (ms-, ps-, start-, text-start, rounded-s-…) instead").toEqual([]);
  });
});
