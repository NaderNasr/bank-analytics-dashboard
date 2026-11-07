import { describe, expect, it } from "vitest";

import ar from "@/i18n/messages/ar.json";
import en from "@/i18n/messages/en.json";
import { CATEGORIES } from "@/server/db/seed/catalog";

import { CATEGORY_OPTIONS } from "./categories";

describe("CATEGORY_OPTIONS", () => {
  it("matches the seeded categories", () => {
    expect(CATEGORY_OPTIONS).toEqual(CATEGORIES.map((c) => ({ slug: c.slug, kind: c.kind })));
  });

  it("has a name in both languages", () => {
    for (const { slug } of CATEGORY_OPTIONS) {
      expect(en.Categories).toHaveProperty(slug);
      expect(ar.Categories).toHaveProperty(slug);
    }
  });
});
