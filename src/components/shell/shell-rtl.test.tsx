import { screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { directionOf } from "@/i18n/routing";
import { renderWithIntl } from "@/test/intl";

import { SidebarNav } from "./sidebar-nav";

// The locale-aware navigation helpers need Next's router; a plain anchor is enough here.
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/transactions",
  Link: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={`/ar${href === "/" ? "" : href}`} {...props} />
  ),
}));

describe("direction", () => {
  it("is right-to-left for Arabic only", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });
});

describe('SidebarNav in Arabic (dir="rtl")', () => {
  it("renders inside a right-to-left root with Arabic labels", () => {
    renderWithIntl(<SidebarNav />, "ar");

    const nav = screen.getByRole("navigation", { name: "القائمة الرئيسية" });
    expect(nav.closest("[dir]")).toHaveAttribute("dir", "rtl");
    expect(nav.closest("[lang]")).toHaveAttribute("lang", "ar");

    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["نظرة عامة", "المعاملات", "الأسواق"]);
  });

  it("marks the current page and places its indicator on the inline-start edge", () => {
    renderWithIntl(<SidebarNav />, "ar");

    const current = screen.getByRole("link", { name: "المعاملات" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveAttribute("href", "/ar/transactions");
    // A logical "start" flips to the right edge under dir="rtl"; "left" would not.
    expect(current.className).toMatch(/\bbefore:start-0\b/);
    expect(current.className).not.toMatch(/\b(?:before:)?(?:left|right)-/);

    expect(screen.getByRole("link", { name: "نظرة عامة" })).not.toHaveAttribute("aria-current");
  });

  it("uses English labels and ltr in English", () => {
    renderWithIntl(<SidebarNav />, "en");
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav.closest("[dir]")).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("link", { name: "Transactions" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
