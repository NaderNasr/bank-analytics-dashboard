import { ArrowLeftRight, LayoutDashboard, LineChart, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: "/" | "/transactions" | "/markets";
  labelKey: "overview" | "transactions" | "markets";
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", labelKey: "overview", icon: LayoutDashboard },
  { href: "/transactions", labelKey: "transactions", icon: ArrowLeftRight },
  { href: "/markets", labelKey: "markets", icon: LineChart },
];

/** Whether `pathname` (without the locale prefix) belongs to a nav item. */
export function isActive(href: NavItem["href"], pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
