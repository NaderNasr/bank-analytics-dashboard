import { expect, test } from "@playwright/test";

const email = process.env.DEMO_USER_EMAIL ?? "demo@bank-analytics.dev";
const password = process.env.DEMO_USER_PASSWORD ?? "";

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.goto("/en/sign-in");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/en");
});

test("shows KPIs, the cash-flow chart, the heatmap, categories and merchants", async ({ page }) => {
  const kpis = page.getByTestId("kpis");
  await expect(kpis.getByText("Total balance")).toBeVisible();
  await expect(kpis).toContainText(/JOD\s[\d,]+\.\d{3}/);

  await expect(page.getByRole("heading", { name: "Cash flow" })).toBeVisible();
  // D3 draws two bars (income, spending) per month for 12 months.
  await expect(page.getByTestId("cash-flow-chart").locator("rect.bar")).toHaveCount(24);

  // Balance chart: hovering snaps a crosshair to a day and shows its balance.
  const balance = page.getByTestId("balance-chart");
  await expect(balance.locator("path.line")).toHaveAttribute("d", /^M/);
  const box = (await balance.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId("balance-tooltip")).toContainText(/JOD\s[\d,]+\.\d{3}/);

  // A full year of days, none missing.
  const cells = page.getByTestId("heatmap").locator("rect");
  expect(await cells.count()).toBeGreaterThanOrEqual(365);
  await cells.filter({ visible: true }).nth(40).hover();
  await expect(page.getByRole("status").filter({ hasText: /JOD|No spending/ })).toBeVisible();

  await expect(page.getByTestId("categories").locator("li")).toHaveCount(8);
  await expect(page.getByRole("heading", { name: "Top merchants" })).toBeVisible();
});

test("switching the period refetches a shorter range with a comparison", async ({ page }) => {
  await expect(page.getByTestId("kpis")).toContainText("No previous period to compare");

  const request = page.waitForRequest((r) => r.url().includes("/api/summary?months=3"));
  await page.getByRole("button", { name: "3M" }).click();
  await request;

  await expect(page.getByRole("button", { name: "3M" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("kpis")).toContainText("vs previous period");
  // D3 fades the old days out before removing them.
  await expect.poll(() => page.getByTestId("heatmap").locator("rect").count()).toBeLessThan(100);
});

test("the Arabic overview mirrors the charts", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("نظرة عامة");
  await expect(page.getByTestId("kpis")).toContainText("إجمالي الرصيد");

  // Months run right-to-left: November (the first month) sits to the right of October (the last).
  const label = (text: string) =>
    page
      .getByTestId("cash-flow-chart")
      .filter({ visible: true })
      .locator(".x-axis text")
      .getByText(text, { exact: true });
  const first = await label("تشرين الثاني").boundingBox();
  const last = await label("تشرين الأول").boundingBox();
  expect(first && last).toBeTruthy();
  expect(first!.x).toBeGreaterThan(last!.x);
});

test("ways to save: suggestions with evidence that link to the transactions behind them", async ({
  page,
}) => {
  const savings = page.getByTestId("savings");
  await expect(savings).toContainText(/You could save about JOD\s[\d,]+ a month/);
  const coffee = page.getByTestId("saving-coffee");
  await expect(coffee).toContainText(/café coffees a month/);
  await expect(coffee).toContainText(/Save ≈ JOD\s[\d,]+\/month/);

  await coffee.getByRole("link", { name: "See transactions" }).click();
  await expect(page).toHaveURL("/en/transactions?category=coffee");
  await expect(page.getByLabel("Category")).toHaveValue("coffee");
  await expect(page.getByTestId("tx-row").filter({ visible: true }).first()).toContainText(
    "Coffee",
  );
});
