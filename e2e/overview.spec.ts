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
  await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible();

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
  await page.getByRole("button", { name: "Last 3 months" }).click();
  await request;

  await expect(page.getByRole("button", { name: "Last 3 months" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("kpis")).toContainText("vs previous period");
  expect(await page.getByTestId("heatmap").locator("rect").count()).toBeLessThan(100);
});

test("the Arabic overview mirrors the charts", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("نظرة عامة");
  await expect(page.getByTestId("kpis")).toContainText("إجمالي الرصيد");

  // Months run right-to-left: November (the first month) sits to the right of October (the last).
  // Recharts 3 draws tick labels in their own layer, outside the axis group.
  const label = (text: string) =>
    page
      .locator(".recharts-cartesian-axis-tick-value")
      .filter({ visible: true })
      .getByText(text, { exact: true });
  const first = await label("تشرين الثاني").boundingBox();
  const last = await label("تشرين الأول").boundingBox();
  expect(first && last).toBeTruthy();
  expect(first!.x).toBeGreaterThan(last!.x);
});
