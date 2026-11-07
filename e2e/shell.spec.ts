import { expect, test, type Page } from "@playwright/test";

const email = process.env.DEMO_USER_EMAIL ?? "demo@bank-analytics.dev";
const password = process.env.DEMO_USER_PASSWORD ?? "";

test.use({ viewport: { width: 1280, height: 800 } });

async function signInAt(page: Page, path: string, submitLabel: string) {
  await page.goto(path);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: submitLabel, exact: true }).click();
  await expect(page).not.toHaveURL(/\/sign-in/);
}

test("Arabic renders right-to-left with the sidebar on the right", async ({ page }) => {
  await signInAt(page, "/ar/sign-in", "تسجيل الدخول");
  await expect(page).toHaveURL("/ar");

  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "ar");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("نظرة عامة");

  const sidebar = await page.getByTestId("sidebar").boundingBox();
  const main = await page.locator("#main").boundingBox();
  expect(sidebar && main).toBeTruthy();
  // Mirrored: the sidebar starts to the right of the main column.
  expect(sidebar!.x).toBeGreaterThan(main!.x);
  expect(sidebar!.x + sidebar!.width).toBeCloseTo(1280, -1);
});

test("English renders left-to-right with the sidebar on the left", async ({ page }) => {
  await signInAt(page, "/en/sign-in", "Sign in");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  const sidebar = await page.getByTestId("sidebar").boundingBox();
  expect(sidebar!.x).toBe(0);
});

test("the language switch keeps the page and query", async ({ page }) => {
  await signInAt(page, "/en/sign-in", "Sign in");
  await page.goto("/en/transactions?q=coffee");
  await page.getByRole("button", { name: "Switch to Arabic" }).click();

  await expect(page).toHaveURL("/ar/transactions?q=coffee");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("link", { name: "المعاملات" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("the theme toggle switches and remembers the theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/en/sign-in");
  const html = page.locator("html");
  await expect(html).not.toHaveAttribute("data-theme");

  await page.getByRole("button", { name: "Theme: System" }).click(); // → Light
  await page.getByRole("button", { name: "Theme: Light" }).click(); // → Dark
  await expect(html).toHaveAttribute("data-theme", "dark");
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(darkBg).toBe("rgb(7, 13, 26)");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Theme: Dark" })).toBeVisible();
});

test("the mobile menu opens as a dialog and navigates", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAt(page, "/en/sign-in", "Sign in");
  await expect(page.getByTestId("sidebar")).toBeHidden();

  await page.getByRole("button", { name: "Open menu" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Markets" }).click();

  await expect(page).toHaveURL("/en/markets");
  await expect(dialog).toBeHidden();
});
