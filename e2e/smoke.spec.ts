import { expect, test } from "@playwright/test";

test("sign-in page renders", async ({ page }) => {
  await page.goto("/en/sign-in");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

test("a path without a locale redirects to one", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en\/sign-in$/);
});
