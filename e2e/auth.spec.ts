import { expect, test, type Page } from "@playwright/test";

const email = process.env.DEMO_USER_EMAIL ?? "demo@bank-analytics.dev";
const password = process.env.DEMO_USER_PASSWORD ?? "";

test.beforeAll(() => {
  if (!password) throw new Error("Set DEMO_USER_PASSWORD (in .env.local or the environment).");
});

/** The form's error region (Next adds a second, empty `alert` for its route announcer). */
const formAlert = (page: Page) => page.locator("#sign-in-error");

async function signIn(page: Page, credentials = { email, password }) {
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("redirects anonymous visitors to sign-in and back after signing in", async ({ page }) => {
  await page.goto("/?from=e2e");
  await expect(page).toHaveURL("/sign-in?callbackUrl=%2F%3Ffrom%3De2e");

  await signIn(page);

  await expect(page).toHaveURL("/?from=e2e");
  await expect(page.getByText("Signed in as")).toBeVisible();
});

test("shows an error for a wrong password and stays on the page", async ({ page }) => {
  await page.goto("/sign-in");
  await signIn(page, { email, password: `${password}-wrong` });

  await expect(formAlert(page)).toHaveText("That email and password don't match our records.");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByLabel("Email")).toHaveValue(email);
});

test("flags empty fields", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(formAlert(page)).toHaveText("Check the highlighted fields and try again.");
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
});

test("the demo account button fills the form", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Use demo account" }).click();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Signed in as")).toBeVisible();
});

test("ignores an off-site callback URL", async ({ page }) => {
  await page.goto("/sign-in?callbackUrl=https%3A%2F%2Fevil.example%2F");
  await signIn(page);
  await expect(page).toHaveURL("/");
});

test("protects the API and unlocks it after sign-in", async ({ page }) => {
  const anonymous = await page.request.get("/api/accounts");
  expect(anonymous.status()).toBe(401);
  expect(await anonymous.json()).toMatchObject({ error: { code: "unauthorized" } });

  await page.goto("/sign-in");
  await signIn(page);
  await expect(page.getByText("Signed in as")).toBeVisible();

  const signedIn = await page.request.get("/api/accounts");
  expect(signedIn.status()).toBe(200);
  const body = (await signedIn.json()) as { data: unknown[] };
  expect(body.data).toHaveLength(3);
});

test("signing out ends the session", async ({ page }) => {
  await page.goto("/sign-in");
  await signIn(page);
  await expect(page.getByText("Signed in as")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");

  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in/);
  expect((await page.request.get("/api/accounts")).status()).toBe(401);
});

test("a signed-in visit to the sign-in page goes to the dashboard", async ({ page }) => {
  await page.goto("/sign-in");
  await signIn(page);
  await expect(page.getByText("Signed in as")).toBeVisible();

  await page.goto("/sign-in");
  await expect(page).toHaveURL("/");
});
