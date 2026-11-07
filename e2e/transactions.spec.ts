import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

const email = process.env.DEMO_USER_EMAIL ?? "demo@bank-analytics.dev";
const password = process.env.DEMO_USER_PASSWORD ?? "";

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.goto("/en/sign-in?callbackUrl=%2Fen%2Ftransactions");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/en/transactions");
});

const rows = (page: import("@playwright/test").Page) =>
  page.getByTestId("tx-row").filter({ visible: true });

test("lists every transaction but only renders the visible rows", async ({ page }) => {
  await expect(page.getByTestId("result-count")).toHaveText(/^[\d,]+ transactions$/);
  const total = Number((await page.getByTestId("result-count").textContent())!.replace(/\D/g, ""));
  expect(total).toBeGreaterThan(10_000);

  await expect(rows(page).first()).toBeVisible();
  expect(await page.getByTestId("tx-row").count()).toBeLessThan(60);
  await expect(page.getByRole("table", { name: "Transactions" })).toHaveAttribute(
    "aria-rowcount",
    String(total + 1),
  );
});

test("scrolling loads the next page", async ({ page }) => {
  await expect(rows(page).first()).toBeVisible();
  const next = page.waitForRequest(
    (r) => r.url().includes("/api/transactions?") && r.url().includes("page=2"),
  );
  const scroller = page.getByRole("table", { name: "Transactions" }).locator("..");
  await scroller.evaluate((el) => el.scrollTo({ top: 100 * 56 }));
  await next;
  // Row 104 (aria-rowindex also counts the header) only exists once page 2 (rows 101-200) loads.
  await expect(page.locator('[data-testid="tx-row"][aria-rowindex="105"]')).toBeAttached();
});

test("search, filters and sort live in the URL and survive a reload", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Search" }).fill("talabat");
  await expect(page).toHaveURL(/q=talabat/);
  await expect(rows(page).first()).toContainText("Talabat");

  await page.getByLabel("Type").selectOption("debit");
  await expect(page).toHaveURL(/direction=debit/);

  await page.getByRole("button", { name: "Amount" }).click();
  await expect(page).toHaveURL(/sort=amount&order=desc/);
  await expect(page.getByRole("columnheader", { name: "Amount" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );

  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Search" })).toHaveValue("talabat");
  await expect(page.getByLabel("Type")).toHaveValue("debit");
  await expect(rows(page).first()).toContainText("Talabat");

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL("/en/transactions?sort=amount&order=desc");
});

test("shows an empty state when nothing matches", async ({ page }) => {
  await page.goto("/en/transactions?q=zzzz-no-such-merchant");
  await expect(page.getByText("No transactions match")).toBeVisible();
  await expect(page.getByTestId("result-count")).toHaveText("0 transactions");
});

test("exports the filtered view as CSV", async ({ page }) => {
  await page.goto("/en/transactions?category=coffee&direction=debit");
  await expect(rows(page).first()).toBeVisible();
  const count = Number((await page.getByTestId("result-count").textContent())!.replace(/\D/g, ""));

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: /^Export CSV \(/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^transactions-\d{4}-\d{2}-\d{2}\.csv$/);

  const csv = (await readFile((await download.path())!, "utf8")).replace(/^﻿/, "");
  const lines = csv.trimEnd().split("\r\n");
  expect(lines[0]).toBe(
    "Date (Asia/Amman),Description,Merchant,Category,Account,Direction,Status,Channel,Amount,Currency,Reference",
  );
  expect(lines).toHaveLength(count + 1);
  expect(lines.slice(1).every((l) => l.includes(",coffee,") && l.includes(",debit,"))).toBe(true);
});

test("the export endpoint needs a session", async ({ browser }) => {
  const anonymous = await browser.newContext();
  const response = await anonymous.request.get("/api/transactions/export");
  expect(response.status()).toBe(401);
  await anonymous.close();
});

test("the Arabic explorer is right-to-left with Latin-digit amounts", async ({ page }) => {
  await page.goto("/ar/transactions");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("المعاملات");
  await expect(rows(page).first()).toBeVisible();
  const header = page.getByRole("columnheader").first();
  const last = page.getByRole("columnheader").last();
  // Date is the first column, so in RTL it sits to the right of Amount.
  expect((await header.boundingBox())!.x).toBeGreaterThan((await last.boundingBox())!.x);
  await expect(rows(page).first()).toContainText(/\d{1,3}(,\d{3})*\.\d{3}/);
});
