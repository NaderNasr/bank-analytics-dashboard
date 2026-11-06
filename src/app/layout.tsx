import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bank Analytics Dashboard",
  description: "A retail banking analytics demo built with Next.js.",
};

// Fonts and design tokens are wired up in Phase 3 (app shell, theming and i18n).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
