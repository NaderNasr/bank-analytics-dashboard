import { expect, test } from "@playwright/test";

test("pages send security headers", async ({ request }) => {
  const response = await request.get("/en/sign-in");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain(
    "connect-src 'self' wss://ws-feed.exchange.coinbase.com",
  );
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("the CSP blocks nothing the app needs, on any page", async ({ page }) => {
  const violations: string[] = [];
  await page.addInitScript(() =>
    document.addEventListener("securitypolicyviolation", (e) =>
      console.log(`CSP-VIOLATION ${e.violatedDirective} ${e.blockedURI}`),
    ),
  );
  page.on("console", (m) => {
    if (m.text().startsWith("CSP-VIOLATION")) violations.push(m.text());
  });
  await page.routeWebSocket("wss://ws-feed.exchange.coinbase.com", () => {});

  await page.goto("/en/sign-in");
  await page.getByRole("button", { name: "Theme: System" }).click();
  await page.locator("#email").fill(process.env.DEMO_USER_EMAIL ?? "demo@bank-analytics.dev");
  await page.locator("#password").fill(process.env.DEMO_USER_PASSWORD ?? "");
  await page.locator("form button[type=submit]").click();
  await expect(page.getByTestId("kpis")).toBeVisible();
  await page.goto("/en/transactions");
  await expect(page.getByTestId("tx-row").first()).toBeVisible();
  await page.goto("/en/markets");
  await expect(page.getByTestId("quote-XAU")).toContainText(/\d/);

  expect(violations).toEqual([]);
});
