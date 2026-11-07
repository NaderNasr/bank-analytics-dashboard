import { expect, test, type Page } from "@playwright/test";

const email = process.env.DEMO_USER_EMAIL ?? "demo@bank-analytics.dev";
const password = process.env.DEMO_USER_PASSWORD ?? "";
const COINBASE = "wss://ws-feed.exchange.coinbase.com";

test.use({ viewport: { width: 1440, height: 900 } });

async function signInTo(page: Page, path: string) {
  await page.goto(`/en/sign-in?callbackUrl=${encodeURIComponent(path)}`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(path);
}

const ticker = (product: string, price: string) =>
  JSON.stringify({
    type: "ticker",
    product_id: product,
    price,
    open_24h: "97000.00",
    high_24h: "99000.00",
    low_24h: "96000.00",
    time: new Date().toISOString(),
  });

test("streams live prices from the feed", async ({ page }) => {
  const subscriptions: unknown[] = [];
  await page.routeWebSocket(COINBASE, (ws) => {
    ws.onMessage((message) => {
      subscriptions.push(JSON.parse(String(message)));
      ws.send(ticker("BTC-USD", "98123.45"));
      setTimeout(() => ws.send(ticker("BTC-USD", "98200.00")), 1_500);
    });
  });
  await signInTo(page, "/en/markets");

  await expect(page.getByTestId("feed-status")).toContainText("Live");
  const btc = page.getByTestId("quote-BTC");
  await expect(btc.getByTestId("price")).toHaveText("USD 98,123.45");
  await expect(btc).toContainText("Live");
  await expect(btc).toContainText(/≈ JOD\s69,569\.\d{3}/);
  await expect(btc.getByTestId("price")).toHaveText("USD 98,200.00", { timeout: 5_000 });

  expect(subscriptions[0]).toEqual({
    type: "subscribe",
    product_ids: ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"],
    channels: ["ticker"],
  });
});

test("falls back to simulated prices when the feed is unreachable", async ({ page }) => {
  await page.routeWebSocket(COINBASE, (ws) => ws.close({ code: 1011, reason: "down" }));
  await signInTo(page, "/en/markets");

  const btc = page.getByTestId("quote-BTC");
  await expect(btc).toContainText("Waiting for the first price");
  await expect(btc).toContainText("Simulated", { timeout: 15_000 });
  await expect(btc.getByTestId("price")).toHaveText(/^USD\s[\d,]+\.\d{2}$/);
});

test("gold and currencies are simulated and keep moving; cards select the detail view", async ({
  page,
}) => {
  await page.routeWebSocket(COINBASE, () => {
    // Accept the connection but never send anything.
  });
  await signInTo(page, "/en/markets");

  const gold = page.getByTestId("quote-XAU");
  await expect(gold).toContainText("Simulated");
  const first = await gold.getByTestId("price").textContent();
  await expect(gold.getByTestId("price")).not.toHaveText(first!, { timeout: 5_000 });

  await gold.click();
  await expect(gold).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 2, name: /Gold/ })).toBeVisible();
  await expect(page.getByTestId("detail-price")).toHaveText(/^USD\s[\d,]+\.\d{2}$/);
});

test("the Arabic markets page is translated and right-to-left", async ({ page }) => {
  await page.routeWebSocket(COINBASE, (ws) => {
    ws.onMessage(() => ws.send(ticker("ETH-USD", "3412.50")));
  });
  await signInTo(page, "/en/markets");
  await page.goto("/ar/markets");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("الأسواق");
  await expect(page.getByTestId("quote-ETH")).toContainText("3,412.50");
  await expect(page.getByTestId("feed-status")).toContainText("مباشر");
});
