import { setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/shell/app-shell";

/** Signed-in pages. The proxy guarantees a session before any of these render. */
export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AppShell>{children}</AppShell>;
}
