import { test, expect } from "@playwright/test";
import { EXAMPLE_HASH } from "./fixtures";

// These tests deliberately do NOT seed the dismissed flag — they exercise the
// Getting started card itself.

const card = (page: import("@playwright/test").Page) =>
  page.getByRole("heading", { name: "Getting started" });

test.describe("Getting started card", () => {
  test("shows on cold start and hides once a dataset is selected", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(card(page)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Watch a 2-minute tutorial/ }),
    ).toBeVisible();

    // Selecting a dataset hides the card immediately.
    await page.getByRole("button", { name: "Demo Dataset" }).click();
    await expect(card(page)).toHaveCount(0);
  });

  test("hidden when data is loaded from the URL hash", async ({ page }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(card(page)).toHaveCount(0);
  });

  test("X closes for the session but the card returns after reload", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(card(page)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(card(page)).toHaveCount(0);

    await page.reload();
    await expect(card(page)).toBeVisible();
  });

  test("'Don't show this again' persists across reloads", async ({ page }) => {
    await page.goto("/");
    await expect(card(page)).toBeVisible();
    await page.getByRole("button", { name: "Don't show this again" }).click();
    await expect(card(page)).toHaveCount(0);

    await page.reload();
    await expect(card(page)).toHaveCount(0);
  });
});
