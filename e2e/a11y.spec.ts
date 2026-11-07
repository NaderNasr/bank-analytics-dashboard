import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const email = process.env.DEMO_USER_EMAIL ?? "demo@bank-analytics.dev";
const password = process.env.DEMO_USER_PASSWORD ?? "";
const COINBASE = "wss://ws-feed.exchange.coinbase.com";

test.use({ viewport: { width: 1440, height: 900 } });

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));
  expect(summary).toEqual([]);
}

async function signIn(page: Page, locale: "en" | "ar") {
  await page.goto(`/${locale}/sign-in`);
  await audit(page);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("form button[type=submit]").click();
  await expect(page).toHaveURL(`/${locale}`);
}

for (const locale of ["en", "ar"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`no WCAG 2.1 AA violations: ${locale}, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.routeWebSocket(COINBASE, () => {});
      await signIn(page, locale);

      await expect(page.getByTestId("kpis")).toBeVisible();
      await audit(page);

      await page.goto(`/${locale}/transactions`);
      await expect(page.getByTestId("tx-row").first()).toBeVisible();
      await audit(page);

      await page.goto(`/${locale}/markets`);
      await expect(page.getByTestId("quote-XAU")).toContainText(/\d/);
      await audit(page);
    });
  }
}
